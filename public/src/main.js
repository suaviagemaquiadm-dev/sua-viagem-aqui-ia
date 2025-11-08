import {
  db,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "./firebase.js";
import { initSearch } from "./search.js";
import { initWeatherWidget, AgencyCarousel, InfiniteCarousel, TestimonialsCarousel, initCarouselFavorites, initAdvertiserGrid } from "./ui.js";
import { initMap } from "./map.js";
import { initAIRouteBuilder } from "./ai.js";

// --- LÓGICA DA APLICAÇÃO ---

document.addEventListener("DOMContentLoaded", () => {
  // Inicializa funções que não dependem de dados do Firestore
  new LanguageSwitcher().init();
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
});

/**
 * NOVO: Carrega os dados dinâmicos do Firestore e inicializa os componentes.
 */
async function loadDynamicContent() {
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
    // Aqui você poderia exibir uma mensagem de erro na UI
  }
}

// Chama a função para carregar o conteúdo dinâmico
loadDynamicContent();

// --- MÓDULO DE INTERNACIONALIZAÇÃO (i18n) ---
class LanguageSwitcher {
  constructor() {
    this.switcher = document.getElementById("language-switcher");
    this.translations = {};
  }

  init() {
    if (!this.switcher) return;

    this.switcher.addEventListener("change", (e) => {
      this.translatePage(e.target.value);
    });

    // Define o idioma inicial
    this.loadAndTranslate(this.switcher.value);
  }

  async loadAndTranslate(lang) {
    if (!this.translations[lang]) {
      try {
        const response = await fetch(`/locales/${lang}.json`);
        this.translations[lang] = await response.json();
      } catch (error) {
        console.error(
          `[i18n] Falha ao carregar o arquivo de idioma para '${lang}'`,
          error,
        );
        return;
      }
    }
    this.translatePage(lang);
  }

  translatePage(lang) {
    const elements = document.querySelectorAll("[data-i18n]");
    const attrElements = document.querySelectorAll("[data-i18n-attr]");
    const langStrings = this.translations[lang];

    // Traduz textos
    elements.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (langStrings[key]) {
        el.innerHTML = langStrings[key];
      } else {
        console.warn(`[i18n] Chave '${key}' não encontrada para '${lang}'`);
      }
    });

    // Traduz atributos (ex: placeholder)
    attrElements.forEach((el) => {
      const attrConfig = el.getAttribute("data-i18n-attr");
      // Ex: "placeholder:search.placeholder,title:search.title"
      attrConfig.split(",").forEach((conf) => {
        const [attr, key] = conf.split(":");
        if (langStrings[key]) {
          el.setAttribute(attr, langStrings[key]);
        } else {
          console.warn(
            `[i18n] Chave de atributo '${key}' não encontrada para '${lang}'`,
          );
        }
      });
    });
  }
}
