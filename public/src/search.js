
import { showAlert } from "./ui/alert.js";
import { trackEvent } from "./analytics.js";
import { db, collection, getDocs, query, where } from "./firebase.js";
import { getResizedImageUrl } from "./utils.js";

let allPartners = [];
let hasFetchedAll = false;

/**
 * Fetches all approved partners from Firestore and caches them in memory.
 * This is used as a fallback when no server-side filters are applied.
 */
async function fetchAndCacheAllPartners() {
  if (hasFetchedAll) return allPartners;

  try {
    const q = query(collection(db, "partners"), where("status", "==", "aprovado"));
    const querySnapshot = await getDocs(q);
    allPartners = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    hasFetchedAll = true;
    return allPartners;
  } catch (error) {
    console.error("Erro ao buscar parceiros para a busca:", error);
    showAlert("Não foi possível carregar os parceiros para a busca. Tente novamente mais tarde.");
    return [];
  }
}


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

    // Coleta os valores dos campos de filtro
    const where = document
      .getElementById("search-where-input")
      .value.trim().toLowerCase();
    const category = document.getElementById("search-category-select").value;
    
    // Validação de input no cliente (OWASP A03)
    if (!where && category === "todos") {
      showAlert(
        "Por favor, preencha o destino ou selecione uma categoria.",
      );
      // Restaura o estado normal do botão
      searchTextEl.classList.remove("hidden");
      searchLoadingEl.classList.add("hidden");
      searchBtn.disabled = false;
      return;
    }
    
    try {
      let partnersToFilter;

      // Otimização: Se uma categoria for selecionada, filtra no backend.
      if (category !== "todos") {
        const q = query(
          collection(db, "partners"),
          where("status", "==", "aprovado"),
          where("category", "==", category)
        );
        const querySnapshot = await getDocs(q);
        partnersToFilter = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } else {
        // Fallback: Se nenhuma categoria for selecionada, usa a lista cacheada de todos os parceiros.
        partnersToFilter = await fetchAndCacheAllPartners();
      }
      
      const searchKeywords = where.split(' ').filter(k => k.length > 1);

      // Filtra os parceiros (já pré-filtrados ou todos) no lado do cliente pelo texto de busca
      const filteredPartners = partnersToFilter.filter(partner => {
        // Se não houver texto de busca, todos os parceiros pré-filtrados são válidos
        if (searchKeywords.length === 0) return true;

        // Cria um texto unificado para busca
        const partnerText = `
          ${partner.businessName?.toLowerCase()} 
          ${partner.city?.toLowerCase()} 
          ${partner.state?.toLowerCase()} 
          ${(partner.tags || []).join(' ').toLowerCase()}
          ${partner.description?.toLowerCase()}
        `;

        // Verifica se alguma palavra-chave da busca está presente nos dados do parceiro
        return searchKeywords.some(keyword => partnerText.includes(keyword));
      });

      renderSearchResults(filteredPartners);

      // Rastrear evento de busca
      trackEvent("search_performed", {
        category: category,
        where_text: where,
        results_count: filteredPartners.length,
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
    document.getElementById("search-where-input").value = "";
    document.getElementById("search-category-select").value = "todos";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function renderSearchResults(partners) {
    searchResultsGrid.innerHTML = ""; // Limpa resultados anteriores

    if (partners && partners.length > 0) {
      noResultsMessage.classList.add("hidden");
      partners.forEach((partner) => {
        const cardWrapper = document.createElement("a");
        cardWrapper.href = `ad_details.html?id=${partner.id}`;
        cardWrapper.className =
          "bg-slate-800 rounded-2xl overflow-hidden flex flex-col card-hover";
        cardWrapper.innerHTML = `
                    <div class="relative overflow-hidden h-48">
                        <img src="${getResizedImageUrl(partner.image, '400x300') || "https://placehold.co/400x300/1e293b/fcd34d?text=SVA"}" alt="${partner.businessName}" class="w-full h-full object-cover">
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