
import {
  db,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "./firebase.js";
import { initSearch } from "./search.js";
import { AgencyCarousel, InfiniteCarousel, TestimonialsCarousel, initAdvertiserGrid } from "./ui.js";
import { initMap } from "./map.js";
import { initAIRouteBuilder } from "./ai.js";

// --- LÓGICA DA APLICAÇÃO ---

document.addEventListener("DOMContentLoaded", () => {
  // Inicializa funções que não dependem de dados do Firestore
  initSearch();
  initMap();
  initAIRouteBuilder();

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