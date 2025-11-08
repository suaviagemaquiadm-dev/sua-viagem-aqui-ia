import {
  auth,
  db,
  doc,
  getDoc,
  collectionGroup,
  query,
  where,
  getDocs,
  orderBy,
  onAuthStateChanged,
} from "/src/firebase.js";
import { initApp } from "/src/app.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp(); // This will handle header and footer loading + auth state

  const loadingContainer = document.getElementById("loading-container");
  const feedGrid = document.getElementById("feed-grid");
  const noFeedMessage = document.getElementById("no-feed-message");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await loadFeed(user.uid);
    } else {
      window.location.href = "pagina_login.html";
    }
  });

  async function loadFeed(userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      const following = userSnap.exists() ? userSnap.data().following || [] : [];

      if (following.length === 0) {
        loadingContainer.classList.add("hidden");
        noFeedMessage.classList.remove("hidden");
        return;
      }

      // Firestore 'in' query is limited to 30 items. For a larger number of followed users,
      // this would need to be split into multiple queries.
      const itinerariesRef = collectionGroup(db, "itineraries");
      const q = query(
        itinerariesRef,
        where("public", "==", true),
        where("ownerId", "in", following.slice(0, 30)),
        orderBy("createdAt", "desc"),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        loadingContainer.classList.add("hidden");
        noFeedMessage.classList.remove("hidden");
        return;
      }

      feedGrid.innerHTML = "";
      for (const docSnap of querySnapshot.docs) {
        const itinerary = { id: docSnap.id, ...docSnap.data() };
        const authorId = itinerary.ownerId;

        // Fetch author info (could be cached for performance)
        const authorSnap = await getDoc(doc(db, "users", authorId));
        const authorName = authorSnap.exists()
          ? authorSnap.data().name
          : "Viajante";

        const card = createItineraryCard(itinerary, authorId, authorName);
        feedGrid.appendChild(card);
      }

      loadingContainer.classList.add("hidden");
      feedGrid.classList.remove("hidden");
    } catch (error) {
      console.error("Erro ao carregar feed:", error);
      loadingContainer.innerHTML =
        '<p class="text-red-400">Não foi possível carregar seu feed. Verifique o console para um link de criação de índice no Firestore.</p>';
    }
  }

  function createItineraryCard(itinerary, authorId, authorName) {
    const card = document.createElement("div");
    card.className =
      "glass-effect rounded-2xl p-6 flex flex-col justify-between card-hover";
    card.innerHTML = `
            <div>
                <a href="roteiro_publico.html?uid=${authorId}&id=${itinerary.id}" class="block">
                    <h3 class="text-xl font-bold text-white truncate hover:text-amber-400">${itinerary.title}</h3>
                </a>
                <p class="text-sm text-slate-400 mt-1">por 
                    <a href="perfil_publico.html?id=${authorId}" class="font-semibold hover:underline">${authorName}</a>
                </p>
                <p class="text-sm text-slate-300 mt-4 line-clamp-3">${itinerary.prompt}</p>
            </div>
            <div class="text-right text-amber-400 font-semibold mt-4">
                <a href="roteiro_publico.html?uid=${authorId}&id=${itinerary.id}">
                    Ver Roteiro <i class="fas fa-arrow-right ml-2"></i>
                </a>
            </div>
        `;
    return card;
  }
});