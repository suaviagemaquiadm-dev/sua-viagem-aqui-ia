import { initApp } from "/src/app.js";
import {
  auth,
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayRemove,
  onAuthStateChanged,
} from "/src/firebase.js";

document.addEventListener('DOMContentLoaded', () => {
    initApp(); // Handles header/footer and auth state

    const loadingContainer = document.getElementById("loading-container");
    const favoritesGrid = document.getElementById("favorites-grid");
    const noFavoritesMessage = document.getElementById("no-favorites-message");
    let currentUserId = null;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadFavorites(user.uid);
        } else {
            // Redirect to login, preserving the intended destination
            window.location.href = `/pagina_login.html?redirectTo=${encodeURIComponent(window.location.pathname)}`;
        }
    });

    async function loadFavorites(userId) {
        try {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists() || userSnap.data().role === "advertiser") {
                // Advertisers don't have a favorites page, redirect to their panel
                window.location.href = "painel_anunciante.html";
                return;
            }

            const favorites = userSnap.data().favorites || [];

            if (favorites.length === 0) {
                loadingContainer.classList.add("hidden");
                noFavoritesMessage.classList.remove("hidden");
                return;
            }

            const partnersRef = collection(db, "partners");
            // Firestore 'in' queries are limited to 30 items. For more, chunking would be needed.
            const q = query(partnersRef, where("__name__", "in", favorites.slice(0, 30)));
            const querySnapshot = await getDocs(q);

            favoritesGrid.innerHTML = "";
            querySnapshot.forEach((docSnap) => {
                const partner = { id: docSnap.id, ...docSnap.data() };
                const card = createPartnerCard(partner);
                favoritesGrid.appendChild(card);
            });

            loadingContainer.classList.add("hidden");
            favoritesGrid.classList.remove("hidden");
        } catch (error) {
            console.error("Erro ao carregar favoritos:", error);
            loadingContainer.innerHTML = '<p class="text-red-400">Não foi possível carregar seus favoritos.</p>';
        }
    }

    function createPartnerCard(partner) {
        const cardWrapper = document.createElement("div");
        cardWrapper.className = "bg-slate-800 rounded-2xl overflow-hidden flex flex-col card-hover relative";
        const verifiedBadge = partner.verified ? ' <i class="fas fa-check-circle text-blue-400 text-sm" title="Parceiro Verificado"></i>' : "";

        cardWrapper.innerHTML = `
            <a href="public_partner_details.html?id=${partner.id}" class="block">
                <img src="${partner.image || "https://placehold.co/400x300/1e293b/fcd34d?text=SVA"}" alt="Imagem de ${partner.businessName}" loading="lazy" decoding="async" class="w-full h-48 object-cover">
                <div class="p-4 flex flex-col flex-grow">
                    <h3 class="text-lg font-bold text-white">${partner.businessName}${verifiedBadge}</h3>
                    <p class="text-sm text-amber-400 capitalize">${(partner.category || "").replace(/_/g, " ")}</p>
                    <p class="text-xs text-slate-400 mt-2"><i class="fas fa-map-marker-alt mr-2"></i>${partner.city}, ${partner.state}</p>
                </div>
            </a>
        `;
        const unfavoriteBtn = document.createElement("button");
        unfavoriteBtn.className = "absolute top-2 right-2 text-red-500 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/75 transition-all";
        unfavoriteBtn.setAttribute("aria-label", `Remover ${partner.businessName} dos favoritos`);
        unfavoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        
        unfavoriteBtn.addEventListener("click", async () => {
            if (!currentUserId) return;
            const userRef = doc(db, "users", currentUserId);
            
            // Optimistic UI update
            cardWrapper.style.transition = 'opacity 0.3s ease';
            cardWrapper.style.opacity = '0';
            setTimeout(() => cardWrapper.remove(), 300);

            try {
                await updateDoc(userRef, {
                    favorites: arrayRemove(partner.id),
                });
                if (favoritesGrid.children.length === 0) {
                    favoritesGrid.classList.add("hidden");
                    noFavoritesMessage.classList.remove("hidden");
                }
            } catch (error) {
                console.error("Erro ao remover favorito:", error);
                // Revert UI change on error if needed
                cardWrapper.style.opacity = '1';
                favoritesGrid.appendChild(cardWrapper); // Re-add if it was removed
            }
        });
        
        cardWrapper.appendChild(unfavoriteBtn);
        return cardWrapper;
    }
});
