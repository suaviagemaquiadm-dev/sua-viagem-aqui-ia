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

      // Chunk the 'following' array into arrays of 30 due to 'in' query limit
      const chunks = [];
      for (let i = 0; i < following.length; i += 30) {
        chunks.push(following.slice(i, i + 30));
      }

      const itinerariesRef = collectionGroup(db, "itineraries");
      const queryPromises = chunks.map(chunk => {
        const q = query(
          itinerariesRef,
          where("public", "==", true),
          where("ownerId", "in", chunk),
          orderBy("createdAt", "desc"),
        );
        return getDocs(q);
      });

      const querySnapshots = await Promise.all(queryPromises);
      
      const allItineraries = [];
      querySnapshots.forEach(snapshot => {
          snapshot.forEach(docSnap => {
              allItineraries.push({ id: docSnap.id, ...docSnap.data() });
          });
      });

      // Sort combined results by date, as each query was sorted individually
      allItineraries.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

      if (allItineraries.length === 0) {
        loadingContainer.classList.add("hidden");
        noFeedMessage.classList.remove("hidden");
        return;
      }

      feedGrid.innerHTML = "";
      
      // Optimize author fetching: get all unique authors at once
      const authorIds = [...new Set(allItineraries.map(it => it.ownerId))];
      const authorPromises = authorIds.map(id => getDoc(doc(db, "users", id)));
      const authorSnaps = await Promise.all(authorPromises);
      const authors = authorSnaps.reduce((acc, snap) => {
          if (snap.exists()) {
              acc[snap.id] = snap.data().name;
          }
          return acc;
      }, {});
      
      allItineraries.forEach(itinerary => {
        const authorName = authors[itinerary.ownerId] || "Viajante";
        const card = createItineraryCard(itinerary, itinerary.ownerId, authorName);
        feedGrid.appendChild(card);
      });

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
                <a href="roteiro_publico.html?user=${authorId}&id=${itinerary.id}" class="block">
                    <h3 class="text-xl font-bold text-white truncate hover:text-amber-400">${itinerary.title}</h3>
                </a>
                <p class="text-sm text-slate-400 mt-1">por 
                    <a href="perfil_publico.html?id=${authorId}" class="font-semibold hover:underline">${authorName}</a>
                </p>
                <p class="text-sm text-slate-300 mt-4 line-clamp-3">${itinerary.prompt}</p>
            </div>
            <div class="text-right text-amber-400 font-semibold mt-4">
                <a href="roteiro_publico.html?user=${authorId}&id=${itinerary.id}">
                    Ver Roteiro <i class="fas fa-arrow-right ml-2"></i>
                </a>
            </div>
        `;
    return card;
  }
});
