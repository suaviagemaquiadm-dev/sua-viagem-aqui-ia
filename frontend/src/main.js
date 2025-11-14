import { showAlert } from "./ui/alert.js";
import { initAIRouteBuilder } from "./ai.js";
import {
  AgencyCarousel,
  InfiniteCarousel,
  TestimonialsCarousel,
  initAdvertiserGrid,
} from "./ui.js";
import { createCheckout } from "./payment.js";
import { initSearch } from "./search.js";
import { callFunction } from "./apiService.js";


/**
 * Inicializa todas as funcionalidades da página principal.
 */
function initHomePage() {
  initSearch();
  initAIRouteBuilder();
  initSubscribeButtons();
  loadCarouselsAndGrids();
  fetchWeather();
}


function initSubscribeButtons() {
    document.querySelectorAll('.subscribe-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // A lógica de verificação de login e criação do checkout
            // é gerenciada pelo módulo de pagamento (`payment.js`).
            const planTitle = e.currentTarget.dataset.planTitle;
            const planPrice = parseFloat(e.currentTarget.dataset.planPrice);
            createCheckout(planTitle, planPrice);
        });
    });
}


async function loadCarouselsAndGrids() {
    try {
        const { premiumPartners, basicPartners, allPartnersForInfiniteScroll } = await callFunction('getHomePageData');

        new AgencyCarousel(premiumPartners || []).init();
        new InfiniteCarousel(allPartnersForInfiniteScroll || []).init();
        initAdvertiserGrid(basicPartners || []);

    } catch (error) {
        console.error("Erro ao carregar dados para os carrosséis:", error);
        showAlert("Não foi possível carregar os destaques da página. Tente recarregar.");
    }

    const testimonialsData = [
       { name: 'Maria S.', role: 'Pousada Aconchego', quote: 'Desde que entramos na plataforma, nossa taxa de ocupação aumentou em 30%. O acesso direto aos viajantes fez toda a diferença!', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=250' },
       { name: 'João P.', role: 'Guia de Ecoturismo', quote: 'A plataforma me conectou com viajantes apaixonados por natureza. Meu trabalho ganhou uma visibilidade que eu não tinha antes. Recomendo!', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250' },
       { name: 'Carla B.', role: 'Restaurante Sabor do Mar', quote: 'Nosso restaurante agora é um ponto de parada obrigatório para turistas que usam o app. O retorno foi imediato e muito positivo.', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=250' }
    ];

    new TestimonialsCarousel(testimonialsData).init();
}


async function fetchWeather() {
    // Esta função pode ser implementada para buscar dados de clima
    console.log("Função de clima a ser implementada.");
}

// Inicializa a página quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", initHomePage);