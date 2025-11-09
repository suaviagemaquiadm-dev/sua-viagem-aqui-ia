import { db, collection, getDocs, query, where } from "./firebase.js";
import { getResizedImageUrl } from "./utils.js";
import { initApp } from './app.js';

let allPartners = [];

/**
 * Renderiza a lista de parceiros no grid.
 * @param {Array} partners - A lista de parceiros a ser renderizada.
 */
function renderPartners(partners) {
  const grid = document.getElementById("partners-grid");
  const noResultsMessage = document.getElementById("no-results-message");

  grid.innerHTML = "";

  if (partners.length === 0) {
    noResultsMessage.classList.remove("hidden");
    grid.classList.add("hidden");
  } else {
    noResultsMessage.classList.add("hidden");
    grid.classList.remove("hidden");
    partners.forEach((partner) => {
      const card = document.createElement("a");
      card.href = `/ad_details.html?id=${partner.id}`;
      card.className = "bg-slate-800 rounded-2xl overflow-hidden flex flex-col card-hover";
      
      const verifiedBadge = partner.verified 
        ? ' <i class="fas fa-check-circle text-blue-400 text-sm" title="Parceiro Verificado"></i>'
        : "";

      card.innerHTML = `
        <div class="relative overflow-hidden h-48">
          <img src="${getResizedImageUrl(partner.image, "400x300") || "https://placehold.co/400x300/1e293b/fcd34d?text=SVA"}" alt="${partner.businessName}" loading="lazy" decoding="async" class="w-full h-full object-cover">
        </div>
        <div class="p-4 flex flex-col flex-grow">
          <h3 class="text-lg font-bold text-white">${partner.businessName}${verifiedBadge}</h3>
          <p class="text-sm text-amber-400 capitalize">${(partner.category || "").replace(/_/g, " ")}</p>
          <p class="text-xs text-slate-400 mt-2"><i class="fas fa-map-marker-alt mr-2"></i>${partner.city}, ${partner.state}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  }
}

/**
 * Filtra os parceiros com base nos inputs do usuário.
 */
function filterPartners() {
  const searchText = document.getElementById("search-text").value.toLowerCase();
  const category = document.getElementById("filter-category").value;

  const filtered = allPartners.filter((partner) => {
    const nameMatch = partner.businessName.toLowerCase().includes(searchText);
    const categoryMatch = category ? partner.category === category : true;
    return nameMatch && categoryMatch;
  });

  renderPartners(filtered);
}

/**
 * Busca todos os parceiros aprovados no Firestore.
 */
async function fetchPartners() {
  const loadingContainer = document.getElementById("loading-container");
  const grid = document.getElementById("partners-grid");

  try {
    const q = query(collection(db, "partners"), where("status", "==", "aprovado"));
    const querySnapshot = await getDocs(q);
    allPartners = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    renderPartners(allPartners);

  } catch (error) {
    console.error("Erro ao buscar parceiros:", error);
    loadingContainer.innerHTML = '<p class="text-red-400 text-center">Não foi possível carregar os parceiros. Tente novamente mais tarde.</p>';
  } finally {
    loadingContainer.classList.add("hidden");
    // O grid é gerenciado por renderPartners, não precisa ser mostrado aqui
  }
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    fetchPartners();

    const searchInput = document.getElementById("search-text");
    const categorySelect = document.getElementById("filter-category");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const clearFiltersEmptyBtn = document.getElementById("clear-filters-btn-empty");

    searchInput.addEventListener("input", filterPartners);
    categorySelect.addEventListener("change", filterPartners);

    const clear = () => {
        searchInput.value = "";
        categorySelect.value = "";
        renderPartners(allPartners);
    };

    clearFiltersBtn.addEventListener("click", clear);
    clearFiltersEmptyBtn.addEventListener("click", clear);
});
