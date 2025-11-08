import { showAlert } from "./ui/alert.js";
import { trackEvent } from "./analytics.js"; // CORREÇÃO: Importa do novo módulo de analytics
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY } from "./firebase-config.js";

// Configuração do Algolia para o Frontend
const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const index = searchClient.initIndex("partners");

/**
 * Inicializa a funcionalidade de busca da página inicial.
 */
export function initSearch() {
  const searchBtn = document.getElementById("search-btn");
  if (!searchBtn) return;

  const searchResultsSection = document.getElementById(
    "search-results-section",
  );
  const searchResultsGrid = document.getElementById("search-results-grid");
  const noResultsMessage = document.getElementById("no-results-message");
  const mainContent = document.getElementById("main-content");
  const heroSection = document.getElementById("hero-section");
  const clearSearchBtn = document.getElementById("clear-search-btn");

  searchBtn.addEventListener("click", async () => {
    const searchTextEl = document.getElementById("search-text");
    const searchLoadingEl = document.getElementById("search-loading");

    // Ativa o estado de carregamento do botão
    searchTextEl.classList.add("hidden");
    searchLoadingEl.classList.remove("hidden");
    searchBtn.disabled = true;

    // Coleta os valores dos novos campos de filtro
    const destination = document
      .getElementById("search-destination-input")
      .value.trim();
    const category = document.getElementById("search-category-select").value;
    const interestLocation = document
      .getElementById("search-location-input")
      .value.trim();

    // Validação de input no cliente (OWASP A03)
    if (!destination && !interestLocation && category === "todos") {
      showAlert(
        "Por favor, preencha pelo menos um campo de busca ou selecione uma categoria.",
      );
      // Restaura o estado normal do botão
      searchTextEl.classList.remove("hidden");
      searchLoadingEl.classList.add("hidden");
      searchBtn.disabled = false;
      return;
    }

    if (
      (destination && destination.length < 2) ||
      (interestLocation && interestLocation.length < 2)
    ) {
      showAlert("Os termos de busca devem ter pelo menos 2 caracteres.");
      searchTextEl.classList.remove("hidden");
      searchLoadingEl.classList.add("hidden");
      searchBtn.disabled = false;
      return;
    }

    try {
      // Combina os textos de busca para uma pesquisa mais rica
      const combinedSearchText = `${destination} ${interestLocation}`.trim();

      // Busca diretamente no Algolia
      const { hits } = await index.search(combinedSearchText, {
        filters: category !== "todos" ? `category:${category}` : "",
      });

      // O Algolia retorna os objetos com um `objectID`. Mapeamos para `id`.
      const partners = hits.map((hit) => ({ id: hit.objectID, ...hit }));

      renderSearchResults(partners);

      // Rastrear evento de busca
      trackEvent("search_performed", {
        category: category,
        destination_text: destination,
        interest_text: interestLocation,
        results_count: partners.length,
      });
      // Exibe a seção de resultados e esconde o conteúdo principal
      mainContent.classList.add("hidden");
      heroSection.classList.add("hidden");
      searchResultsSection.classList.remove("hidden");
      window.scrollTo({
        top: searchResultsSection.offsetTop - 80,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Erro ao buscar parceiros:", error);
      showAlert(
        "Não foi possível realizar a busca. Verifique o console para mais detalhes.",
      );
    } finally {
      // Restaura o estado normal do botão
      searchTextEl.classList.remove("hidden");
      searchLoadingEl.classList.add("hidden");
      searchBtn.disabled = false;
    }
  });

  clearSearchBtn.addEventListener("click", () => {
    searchResultsSection.classList.add("hidden");
    mainContent.classList.remove("hidden");
    heroSection.classList.remove("hidden");
    // Limpa todos os campos de busca
    document.getElementById("search-destination-input").value = "";
    document.getElementById("search-category-select").value = "todos";
    document.getElementById("search-location-input").value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function renderSearchResults(partners) {
    searchResultsGrid.innerHTML = ""; // Limpa resultados anteriores

    if (partners && partners.length > 0) {
      noResultsMessage.classList.add("hidden");
      partners.forEach((partner) => {
        const cardWrapper = document.createElement("a");
        cardWrapper.href = `public_partner_details.html?id=${partner.id}`;
        cardWrapper.className =
          "bg-slate-800 rounded-2xl overflow-hidden flex flex-col card-hover";
        cardWrapper.innerHTML = `
                    <div class="relative overflow-hidden h-48">
                        <img src="${partner.image || "https://placehold.co/400x300/1e293b/fcd34d?text=SVA"}" alt="${partner.businessName}" class="w-full h-full object-cover">
                    </div>
                    <div class="p-4 flex flex-col flex-grow">
                        <h3 class="text-lg font-bold text-white">${partner.businessName}</h3>
                        <p class="text-sm text-amber-400 capitalize">${(partner.category || "").replace(/_/g, " ")}</p>
                        <p class="text-xs text-slate-400 mt-2"><i class="fas fa-map-marker-alt mr-2"></i>${partner.city}, ${partner.state}</p>
                    </div>
                `;
        searchResultsGrid.appendChild(cardWrapper);
      });
    } else {
      noResultsMessage.classList.remove("hidden");
    }
  }
}
