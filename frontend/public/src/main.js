
import { httpsCallable, functions } from "./firebase.js";
import { showAlert } from "./ui/alert.js";
import { initAIRouteBuilder } from "./ai.js";
import { AgencyCarousel, InfiniteCarousel, TestimonialsCarousel, initAdvertiserGrid } from "./ui.js";
import { createCheckout } from "./payment.js";
import { initSearch } from "./search.js";


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
        const getHomePageData = httpsCallable(functions, 'getHomePageData');
        const result = await getHomePageData();
        const { premiumPartners, basicPartners, allPartnersForInfiniteScroll } = result.data;

        new AgencyCarousel(premiumPartners || []).init();
        new InfiniteCarousel(allPartnersForInfiniteScroll || []).init();
        initAdvertiserGrid(basicPartners || []);

    } catch (error) {
        console.error("Erro ao carregar dados para os carrosséis:", error);
        showAlert("Não foi possível carregar os destaques da página. Tente recarregar.");
    }

    const testimonialsData = [
       { name: 'Maria S.', role: 'Pousada Aconchego', quote: 'Desde que entramos na plataforma, nossa taxa de ocupação aumentou em 30%. O acesso direto aos viajantes fez toda a diferença!', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=250' },
       { name: 'João P.', role: 'Guia de Ecoturismo', quote: 'A visibilidade que o plano Basic me deu foi incrível. Recebo contatos de clientes que antes eu nem sonhava em alcançar. Recomendo!', img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=250' }
    ];
    new TestimonialsCarousel(testimonialsData).init();
}

async function fetchWeather() {
    const weatherWidget = document.getElementById('weather-widget');
    if (!weatherWidget) return;
    weatherWidget.innerHTML = `<div class="text-center text-slate-400 w-full">Carregando previsão do tempo...</div>`;

    const getWeather = httpsCallable(functions, 'getWeatherForecast');
     try {
        const result = await getWeather();
        const data = result.data;

        if (!data || !data.city) throw new Error("Dados de previsão indisponíveis.");

        const dailyForecasts = data.list.filter(item => item.dt_txt.includes("12:00:00"));
        if (!dailyForecasts.length) throw new Error("Previsão diária não encontrada.");

        const today = dailyForecasts[0];
        const todayIcon = getWeatherIcon(today.weather[0].id);
        const todayTemp = Math.round(today.main.temp);

        let forecastHTML = `
            <div class="flex items-center space-x-4 flex-1">
                <div>
                    <p class="text-lg font-semibold text-white">${data.city.name}</p>
                    <p class="text-sm text-slate-300">Hoje</p>
                </div>
                <div class="text-right">
                    <i class="fas ${todayIcon} text-4xl text-amber-400"></i>
                    <p class="text-3xl font-bold text-white">${todayTemp}°C</p>
                </div>
            </div>
            <div class="border-l border-slate-600 pl-4 flex space-x-4">
        `;

        for (let i = 1; i < 3 && i < dailyForecasts.length; i++) {
            const day = dailyForecasts[i];
            const dayName = new Date(day.dt * 1000).toLocaleDateString('pt-BR', { weekday: 'short' });
            const dayIcon = getWeatherIcon(day.weather[0].id);
            const dayTemp = Math.round(day.main.temp);

            forecastHTML += `
                <div class="text-center">
                    <p class="font-semibold text-white">${dayName}</p>
                    <i class="fas ${dayIcon} text-2xl text-slate-300 my-1"></i>
                    <p class="font-bold text-white">${dayTemp}°</p>
                </div>
            `;
        }

        forecastHTML += `</div>`;
        weatherWidget.innerHTML = forecastHTML;

    } catch (error) {
        console.error("Erro ao buscar previsão do tempo:", error);
        weatherWidget.innerHTML = `<div class="text-center text-slate-400 w-full">Não foi possível carregar a previsão do tempo.</div>`;
    }
}

function getWeatherIcon(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return 'fa-bolt';
    if (weatherId >= 300 && weatherId < 400) return 'fa-cloud-rain';
    if (weatherId >= 500 && weatherId < 600) return 'fa-cloud-showers-heavy';
    if (weatherId >= 600 && weatherId < 700) return 'fa-snowflake';
    if (weatherId >= 700 && weatherId < 800) return 'fa-smog';
    if (weatherId === 800) return 'fa-sun';
    if (weatherId === 801) return 'fa-cloud-sun';
    if (weatherId > 801) return 'fa-cloud';
    return 'fa-question-circle';
}

// Inicia tudo quando o DOM está pronto.
initHomePage();
