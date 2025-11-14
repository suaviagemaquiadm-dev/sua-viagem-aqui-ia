import {
  auth,
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onAuthStateChanged,
  httpsCallable,
  functions,
} from "./firebase.js";
import { initApp } from "./app.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp();

  const loadingContainer = document.getElementById("loading-container");
  const errorContainer = document.getElementById("error-container");
  const profileContent = document.getElementById("profile-content");
  let currentUserId = null;
  let viewingUserId = null;

  async function loadPublicProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    viewingUserId = urlParams.get("id");

    if (!viewingUserId) {
      showError();
      return;
    }

    try {
      const userRef = doc(db, "users", viewingUserId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        document.title = `Perfil de ${userData.name} - Sua Viagem Aqui`;
        document.getElementById("user-name").textContent = userData.name;
        document.getElementById("profile-picture").src =
          userData.photoURL ||
          "https://placehold.co/128x128/1f2937/fcd34d?text=SVA";
        document.getElementById("followers-count").innerHTML = `<strong>${
          (userData.followers || []).length
        }</strong> Seguidores`;
        document.getElementById("following-count").innerHTML = `<strong>${
          (userData.following || []).length
        }</strong> Seguindo`;

        displayBadges(userData.badges || {});
        displayInterests(userData.interests || []);
        await loadPublicItineraries(viewingUserId);

        onAuthStateChanged(auth, (currentUser) => {
          currentUserId = currentUser ? currentUser.uid : null;
          setupFollowButton(userData);
        });

        loadingContainer.classList.add("hidden");
        profileContent.classList.remove("hidden");
      } else {
        showError();
      }
    } catch (error) {
      console.error("Erro ao carregar perfil público:", error);
      showError();
    }
  }

  function setupFollowButton(viewedUserData) {
    const followContainer = document.getElementById("follow-button-container");
    if (!currentUserId || currentUserId === viewingUserId) {
      followContainer.innerHTML = "";
      return;
    }

    const isFollowing = (viewedUserData.followers || []).includes(
      currentUserId,
    );
    const button = document.createElement("button");
    button.id = "follow-btn";
    button.className = `font-bold py-2 px-6 rounded-lg transition-colors ${
      isFollowing
        ? "bg-slate-600 hover:bg-slate-700 text-white"
        : "bg-cyan-600 hover:bg-cyan-700 text-white"
    }`;
    button.innerHTML = isFollowing
      ? '<i class="fas fa-check mr-2"></i> Seguindo'
      : '<i class="fas fa-user-plus mr-2"></i> Seguir';

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      const toggleFollow = httpsCallable(functions, "toggleFollowUser");
      try {
        await toggleFollow({ targetUserId: viewingUserId });
        // Recarrega o perfil para atualizar contadores e estado do botão
        loadPublicProfile();
      } catch (error) {
        console.error("Erro ao seguir/deixar de seguir:", error);
        button.disabled = false;
        // Restaura o estado anterior do botão em caso de erro
        button.innerHTML = isFollowing
          ? '<i class="fas fa-check mr-2"></i> Seguindo'
          : '<i class="fas fa-user-plus mr-2"></i> Seguir';
      }
    });

    followContainer.innerHTML = "";
    followContainer.appendChild(button);
  }

  function displayBadges(badges) {
    const badgesGrid = document.getElementById("badges-grid");
    const noBadgesMessage = document.getElementById("no-badges-message");
    badgesGrid.innerHTML = "";

    if (!badges || Object.keys(badges).length === 0) {
      noBadgesMessage.classList.remove("hidden");
      return;
    }
    noBadgesMessage.classList.add("hidden");
    for (const badgeId in badges) {
      const badge = badges[badgeId];
      const badgeElement = createBadgeElement(badge);
      badgesGrid.appendChild(badgeElement);
    }
  }

  function displayInterests(interests) {
    const interestsList = document.getElementById("interests-list");
    const noInterestsMessage = document.getElementById("no-interests-message");
    interestsList.innerHTML = "";

    if (!interests || interests.length === 0) {
      noInterestsMessage.classList.remove("hidden");
      interestsList.appendChild(noInterestsMessage);
      return;
    }
    
    noInterestsMessage.classList.add("hidden");
    interests.forEach(interest => {
        const tagElement = document.createElement("span");
        tagElement.className = "tag-item";
        tagElement.textContent = interest;
        interestsList.appendChild(tagElement);
    });
  }

  async function loadPublicItineraries(userId) {
    const grid = document.getElementById("itineraries-grid");
    const noMsg = document.getElementById("no-itineraries-message");
    grid.innerHTML = "";
    noMsg.classList.add("hidden");

    const itinerariesRef = collection(db, "users", userId, "itineraries");
    const q = query(
      itinerariesRef,
      where("public", "==", true),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      noMsg.classList.remove("hidden");
    } else {
      snapshot.forEach((doc) => {
        const itinerary = { id: doc.id, ...doc.data() };
        const card = document.createElement("a");
        card.href = `roteiro_publico.html?user=${userId}&id=${itinerary.id}`;
        card.className =
          "glass-effect rounded-2xl p-6 flex flex-col justify-between card-hover";
        card.innerHTML = `<div><h3 class="text-xl font-bold text-white truncate">${itinerary.title}</h3><p class="text-sm text-slate-300 mt-4 line-clamp-3">${itinerary.prompt}</p></div><div class="text-right text-amber-400 font-semibold mt-4">Ver Roteiro <i class="fas fa-arrow-right ml-2"></i></div>`;
        grid.appendChild(card);
      });
    }
  }

  function createBadgeElement(badge) {
    const badgeDiv = document.createElement("div");
    badgeDiv.className =
      "bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col items-center justify-center text-center";
    badgeDiv.innerHTML = `
            <i class="${
              badge.icon
            } text-4xl text-amber-400 mb-3"></i>
            <h4 class="font-bold text-white text-lg">${badge.name}</h4>
            <p class="text-sm text-slate-400 mt-1">${badge.description}</p>
            <p class="text-xs text-slate-500 mt-2">Conquistado em: ${new Date(
              badge.awardedAt?.toDate(),
            ).toLocaleDateString("pt-BR")}</p>
        `;
    return badgeDiv;
  }

  function showError() {
    loadingContainer.classList.add("hidden");
    errorContainer.classList.remove("hidden");
  }

  loadPublicProfile();
});
