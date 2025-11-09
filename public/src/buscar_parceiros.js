import { db, collection, getDocs, query, where, orderBy, limit, startAfter } from "./firebase.js";
import { getResizedImageUrl } from "./utils.js";
import { initApp } from './app.js';

let lastVisible = null; // Para paginação
let allPartners = []; // Cache para buscas subsequentes sem filtro de categoria
let currentQueryConstraints = [];

const loadingContainer = document.getElementById("loading-container");
const grid = document.getElementById("partners-grid");
const noResultsMessage = document.getElementById("no-results-message");

/**
 * Renderiza a lista de parceiros no grid.
 * @param {Array} partners - A lista de parceiros a ser renderizada.
 * @param {boolean} append - Se deve adicionar aos resultados existentes (paginação).
 */
function renderPartners(partners, append = false) {
  if (!append) {
    grid.innerHTML = "";
  }

  if (partners.length === 0 && !append) {
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
 * Executa a busca no Firestore com base nos filtros atuais.
 */
async function performSearch() {
  loadingContainer.classList.remove("hidden");
  grid.classList.add("hidden");
  noResultsMessage.classList.add("hidden");
  
  const searchText = document.getElementById("search-text").value.toLowerCase().trim();
  const category = document.getElementById("filter-category").value;
  
  // Reseta a paginação para uma nova busca
  lastVisible = null; 

  currentQueryConstraints = [where("status", "==", "aprovado")];
  if (category) {
      currentQueryConstraints.push(where("category", "==", category));
  }
  // A busca por texto é feita no lado do cliente após a consulta inicial
  // O ideal seria usar um serviço como Algolia para busca de texto completa no backend.

  try {
    const q = query(collection(db, "partners"), ...currentQueryConstraints, orderBy("businessName"), limit(12));
    const querySnapshot = await getDocs(q);
    
    lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    allPartners = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filtro de texto no lado do cliente
    const filteredPartners = searchText
      ? allPartners.filter(p => p.businessName.toLowerCase().includes(searchText))
      : allPartners;

    renderPartners(filteredPartners);

  } catch (error) {
    console.error("Erro ao buscar parceiros:", error);
    loadingContainer.innerHTML = '<p class="text-red-400 text-center">Não foi possível carregar os parceiros. Tente novamente mais tarde.</p>';
  } finally {
    loadingContainer.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    performSearch(); // Carga inicial

    const searchInput = document.getElementById("search-text");
    const categorySelect = document.getElementById("filter-category");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const clearFiltersEmptyBtn = document.getElementById("clear-filters-btn-empty");

    let searchTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 500); // Debounce
    });

    categorySelect.addEventListener("change", performSearch);

    const clear = () => {
        searchInput.value = "";
        categorySelect.value = "";
        performSearch();
    };

    clearFiltersBtn.addEventListener("click", clear);
    clearFiltersEmptyBtn.addEventListener("click", clear);
});