

import {
  db,
  collection,
  query,
  where,
  getDocs,
  limit,
  functions,
  httpsCallable,
} from "./firebase.js";
import { initSearch } from "./search.js";
import { AgencyCarousel, InfiniteCarousel, TestimonialsCarousel, initAdvertiserGrid } from "./ui.js";
import { initMap } from "./map.js";
import { initAIRouteBuilder } from "./ai.js";

// --- LÓGICA DA APLICAÇÃO ---

/**
 * Initializes the "Surprise Me" destination suggestion feature.
 */
function initSurpriseMe() {
    const surpriseBtn = document.getElementById("surprise-btn");
    if (!surpriseBtn) return;

    const btnText = document.getElementById("surprise-btn-text");
    const btnLoading = document.getElementById("surprise-btn-loading");
    const resultContainer = document.getElementById("surprise-result-container");

    surpriseBtn.addEventListener("click", async () => {
        btnText.classList.add("hidden");
        btnLoading.classList.remove("hidden");
        surpriseBtn.disabled = true;
        resultContainer.classList.add("hidden"); // Hide previous result

        try {
            const suggestDestination = httpsCallable(functions, 'suggestDestination');
            const result = await suggestDestination();

            if (result.data.success) {
                const { destination, description } = result.data.data;
                
                resultContainer.innerHTML = `
                    <div class="surprise-result-card glass-effect rounded-2xl p-8 text-center border border-slate-700">
                        <p class="text-sm font-bold text-amber-400 uppercase tracking-widest">Sua Próxima Aventura</p>
                        <h3 class="text-4xl font-extrabold text-white mt-2">${destination}</h3>
                        <p class="text-slate-300 mt-4 max-w-lg mx-auto">${description}</p>
                        <button class="search-surprise-btn mt-6 bg-transparent border-2 border-amber-400 text-amber-400 font-bold py-2 px-6 rounded-full hover:bg-amber-400 hover:text-slate-900 transition-colors">
                            Ver parceiros no local <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                `;
                resultContainer.classList.remove("hidden");

                resultContainer.querySelector('.search-surprise-btn').addEventListener('click', () => {
                     const whereInput = document.getElementById("search-where-input");
                     const searchButton = document.getElementById("search-btn");
                     if (whereInput && searchButton) {
                         // Use just the city/place name for search, removing state abbreviation
                         whereInput.value = destination.split(',')[0].trim(); 
                         searchButton.click();
                         window.scrollTo({ top: 0, behavior: "smooth" });
                     }
                });

            } else {
                throw new Error(result.data.error || "A função retornou um erro.");
            }

        } catch (error) {
            console.error("Erro ao sugerir destino:", error);
            resultContainer.innerHTML = `<p class="text-center text-red-400">Oops! Não conseguimos encontrar uma sugestão agora. Tente novamente!</p>`;
            resultContainer.classList.remove("hidden");
        } finally {
            btnText.classList.remove("hidden");
            btnLoading.classList.add("hidden");
            surpriseBtn.disabled = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
  // Inicializa funções que não dependem de dados do Firestore
  initSearch();
  initMap();
  initAIRouteBuilder();
  initSurpriseMe();

  // Scroll suave para âncoras
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
  
  // Carrega o conteúdo dinâmico após a inicialização básica
  loadDynamicContent();
});

/**
 * Carrega os dados dinâmicos do Firestore e inicializa os componentes.
 */
async function loadDynamicContent() {
  const advertiserGrid = document.getElementById("advertiser-grid");

  try {
    // Busca parceiros com plano 'plus' ou 'advance' para os carrosséis
    const partnersRef = collection(db, "partners");
    const premiumPartnersQuery = query(
      partnersRef,
      where("status", "==", "aprovado"),
      where("plan", "in", ["plus", "advance"]),
      limit(10),
    );

    // Busca parceiros com plano 'basic' para o grid
    const basicPartnersQuery = query(
      partnersRef,
      where("status", "==", "aprovado"),
      where("plan", "==", "basic"),
      limit(8),
    );

    // Busca depoimentos
    const testimonialsQuery = query(collection(db, "testimonials"), limit(5));

    // Executa todas as buscas em paralelo para otimizar o carregamento
    const [premiumPartnersSnap, basicPartnersSnap, testimonialsSnap] =
      await Promise.all([
        getDocs(premiumPartnersQuery),
        getDocs(basicPartnersQuery),
        getDocs(testimonialsQuery),
      ]);

    const premiumPartners = premiumPartnersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const basicPartners = basicPartnersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const testimonials = testimonialsSnap.docs.map((doc) => doc.data());

    // Inicializa os componentes com os dados reais
    new AgencyCarousel(
      premiumPartners.filter((p) => p.category === "agencias"),
    ).init();
    new InfiniteCarousel("partners-carousel-track", premiumPartners).init();
    new TestimonialsCarousel(testimonials).init();
    initAdvertiserGrid(basicPartners);

  } catch (error) {
    console.error("Erro ao carregar conteúdo dinâmico:", error);
    if (advertiserGrid) {
      advertiserGrid.innerHTML = `<p class="text-center text-red-400 col-span-full">Não foi possível carregar os parceiros. Tente recarregar a página.</p>`;
    }
  }
}