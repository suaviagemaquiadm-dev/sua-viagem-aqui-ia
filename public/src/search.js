import { showAlert } from "./ui/alert.js";
import { trackEvent } from "./analytics.js";
import { functions } from "./firebase.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { getResizedImageUrl } from "./utils.js";

/**
 * Inicializa a funcionalidade de busca da página inicial, agora usando uma Cloud Function.
 */
export function initSearch() {
  const searchBtn = document.getElementById("search-btn");
  if (!searchBtn) return;

  const searchResultsSection = document.getElementById("search-results-section");
  const searchResultsGrid = document.getElementById("search-results-grid");
  const noResultsMessage = document.getElementById("no-results-message");
  const mainContent = document.getElementById("main-content");
  const heroSection = document.getElementById("hero-section");
  const clearSearchBtn = document.getElementById("clear-search-btn");

  searchBtn.addEventListener("click", async () => {
    const searchTextEl = document.getElementById("search-text");
    const searchLoadingEl = document.getElementById("search-loading");

    searchTextEl.classList.add("hidden");
    searchLoadingEl.classList.remove("hidden");
    searchBtn.disabled = true;

    const where = document.getElementById("search-where-input").value.trim();
    const category = document.getElementById("search-category-select").value;

    if (!where && category === "todos") {
      showAlert("Por favor, preencha o destino ou selecione uma categoria.");
      searchTextEl.classList.remove("hidden");
      searchLoadingEl.classList.add("hidden");
      searchBtn.disabled = false;
      return;
    }

    try {
      // Chama a Cloud Function para realizar a busca no backend
      const searchPartnersFn = httpsCallable(functions, 'searchPartners');
      const result = await searchPartnersFn({ text: where, category: category });
      const filteredPartners = result.data;

      renderSearchResults(filteredPartners);

      trackEvent("search_performed", {
        category: category,
        where_text: where,
        results_count: filteredPartners.length,
      });

      mainContent.classList.add("hidden");
      heroSection.classList.add("hidden");
      searchResultsSection.classList.remove("hidden");
      window.scrollTo({
        top: searchResultsSection.offsetTop - 80,
        behavior: "smooth",
      });

    } catch (error) {
      console.error("Erro ao buscar parceiros:", error);
      showAlert("Não foi possível realizar a busca. Verifique o console para mais detalhes.");
    } finally {
      searchTextEl.classList.remove("hidden");
      searchLoadingEl.classList.add("hidden");
      searchBtn.disabled = false;
    }
  });

  clearSearchBtn.addEventListener("click", () => {
    searchResultsSection.classList.add("hidden");
    mainContent.classList.remove("hidden");
    heroSection.classList.remove("hidden");
    document.getElementById("search-where-input").value = "";
    document.getElementById("search-category-select").value = "todos";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function renderSearchResults(partners) {
    searchResultsGrid.innerHTML = "";

    if (partners && partners.length > 0) {
      noResultsMessage.classList.add("hidden");
      partners.forEach((partner) => {
        const cardWrapper = document.createElement("a");
        cardWrapper.href = `ad_details.html?id=${partner.id}`;
        cardWrapper.className = "bg-slate-800 rounded-2xl overflow-hidden flex flex-col card-hover";
        const ratingHTML = partner.averageRating
          ? `<div class="flex items-center text-xs">
               <i class="fas fa-star text-amber-400 mr-1"></i>
               <span class="font-bold text-white">${partner.averageRating.toFixed(1)}</span>
               <span class="text-slate-400 ml-1">(${partner.reviewCount || 0})</span>
             </div>`
          : `<span class="text-xs text-slate-400">Sem avaliações</span>`;

        cardWrapper.innerHTML = `
          <div class="relative overflow-hidden h-48">
              <img src="${getResizedImageUrl(partner.image, '400x300') || "https://placehold.co/400x300/1e293b/fcd34d?text=SVA"}" alt="${partner.businessName}" class="w-full h-full object-cover">
          </div>
          <div class="p-4 flex flex-col flex-grow">
              <h3 class="text-lg font-bold text-white">${partner.businessName}</h3>
              <p class="text-sm text-amber-400 capitalize">${(partner.category || "").replace(/_/g, " ")}</p>
              <div class="flex justify-between items-center mt-2">
                <p class="text-xs text-slate-400"><i class="fas fa-map-marker-alt mr-2"></i>${partner.city}, ${partner.state}</p>
                ${ratingHTML}
              </div>
          </div>
        `;
        searchResultsGrid.appendChild(cardWrapper);
      });
    } else {
      noResultsMessage.classList.remove("hidden");
    }
  }
}