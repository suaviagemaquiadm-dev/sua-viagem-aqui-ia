import {
  db,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  auth,
  onAuthStateChanged,
} from "./firebase.js";
import { initApp } from "./app.js";
import { getResizedImageUrl } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp(); // Loads header, footer, auth state

  const container = document.getElementById("ad-details-container");
  const loadingState = document.getElementById("loading-state");
  const urlParams = new URLSearchParams(window.location.search);
  const partnerId = urlParams.get("id");
  let currentUser = null;
  let isFavorited = false; // Add state to track favorite status

  // Listen for auth state changes to update UI dynamically
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (partnerId) {
      loadPartnerDetails(partnerId);
    }
  });

  if (!partnerId) {
    loadingState.innerHTML =
      '<p class="text-red-400 text-center text-lg">ID do parceiro não fornecido. Não é possível carregar os detalhes.</p>';
    return;
  }

  async function loadPartnerDetails(id) {
    try {
      const partnerRef = doc(db, "partners", id);
      const docSnap = await getDoc(partnerRef);

      if (docSnap.exists()) {
        const partner = { id: docSnap.id, ...docSnap.data() };
        document.title = `${partner.businessName} - Sua Viagem Aqui`;
        await renderPartnerDetails(partner);
        loadingState.classList.add("hidden");
      } else {
        loadingState.innerHTML =
          '<p class="text-red-400 text-center text-lg">Parceiro não encontrado.</p>';
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes do parceiro:", error);
      loadingState.innerHTML =
        '<p class="text-red-400 text-center text-lg">Ocorreu um erro ao carregar os detalhes. Tente novamente.</p>';
    }
  }

  async function renderPartnerDetails(partner) {
    const tagsHtml = (partner.tags || [])
      .map(
        (tag) =>
          `<span class="bg-slate-700 text-amber-400 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">${tag}</span>`,
      )
      .join("");

    const verifiedBadge = partner.verified
      ? ' <i class="fas fa-check-circle text-blue-400 text-lg ml-2" title="Parceiro Verificado"></i>'
      : "";

    container.innerHTML = `
      <div class="glass-effect rounded-2xl shadow-2xl overflow-hidden">
        <div class="h-64 md:h-80 bg-cover bg-center" style="background-image: url('${
          getResizedImageUrl(partner.image, "800x600") ||
          "https://placehold.co/800x400/1e293b/fcd34d?text=SVA"
        }')"></div>
        <div class="p-6 md:p-10">
          <div class="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-700 pb-6 mb-6">
            <div>
              <p class="text-amber-400 font-semibold capitalize">${(
                partner.category || ""
              ).replace(/_/g, " ")}</p>
              <h1 class="text-3xl md:text-4xl font-bold text-white flex items-center">${
                partner.businessName
              }${verifiedBadge}</h1>
              <p class="text-slate-400 mt-2"><i class="fas fa-map-marker-alt mr-2"></i>${
                partner.city
              }, ${partner.state}</p>
            </div>
            <div id="favorite-btn-container" class="mt-4 md:mt-0">
                <!-- Botão de favorito será inserido aqui -->
            </div>
          </div>
          
          <div>
            <h2 class="text-2xl font-bold text-white mb-4">Sobre</h2>
            <p class="text-slate-300 whitespace-pre-wrap leading-relaxed">${
              partner.description || "Nenhuma descrição fornecida."
            }</p>
          </div>

          <div class="mt-8">
            <h2 class="text-2xl font-bold text-white mb-4">Tags</h2>
            <div class="flex flex-wrap gap-2">${
              tagsHtml || '<p class="text-slate-400">Nenhuma tag definida.</p>'
            }</div>
          </div>

          <div class="mt-8 pt-8 border-t border-slate-700">
             <h2 class="text-2xl font-bold text-white mb-4">Contato</h2>
             <a href="https://wa.me/55${(partner.whatsapp || "").replace(
               /\D/g,
               "",
             )}" target="_blank" rel="noopener noreferrer" class="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                <i class="fab fa-whatsapp mr-3"></i>Contatar via WhatsApp
             </a>
          </div>
        </div>
      </div>
    `;
    await setupFavoriteButton(partner.id);
  }

  async function setupFavoriteButton(partnerId) {
    const favBtnContainer = document.getElementById("favorite-btn-container");
    if (!favBtnContainer) return;

    if (!currentUser) {
      favBtnContainer.innerHTML = '';
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || userSnap.data().role === 'advertiser') {
        favBtnContainer.innerHTML = ''; // Anunciantes não podem favoritar
        return;
    }
    
    const favorites = userSnap.data().favorites || [];
    isFavorited = favorites.includes(partnerId);

    const favBtn = document.createElement("button");
    favBtn.className = `btn-secondary flex items-center gap-2 transition-colors py-3 px-5`;
    
    const updateBtnState = () => {
        if(isFavorited) {
            favBtn.innerHTML = `<i class="fas fa-heart text-red-500"></i> Salvo como Favorito`;
            favBtn.classList.add('bg-red-500/20', 'text-red-400');
        } else {
            favBtn.innerHTML = `<i class="far fa-heart"></i> Salvar como Favorito`;
            favBtn.classList.remove('bg-red-500/20', 'text-red-400');
        }
    };

    updateBtnState();

    favBtn.addEventListener("click", async () => {
      favBtn.disabled = true;
      isFavorited = !isFavorited; // Optimistic update
      updateBtnState();

      try {
        await updateDoc(userRef, {
          favorites: isFavorited ? arrayUnion(partnerId) : arrayRemove(partnerId),
        });
      } catch (error) {
        console.error("Erro ao atualizar favoritos:", error);
        isFavorited = !isFavorited; // Revert state on error
        updateBtnState();
      } finally {
        favBtn.disabled = false;
      }
    });

    favBtnContainer.innerHTML = '';
    favBtnContainer.appendChild(favBtn);
  }
});
