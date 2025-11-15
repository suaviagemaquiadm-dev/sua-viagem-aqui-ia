import { db, functions, auth } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { showAlert } from "./ui/alert.js";
import { createCheckout } from "./payment.js";
import { initAIRouteBuilder } from "./ai.js";

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa a IA na página principal
    initAIRouteBuilder();

    const subscribeButtons = document.querySelectorAll(".subscribe-btn");
    subscribeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const user = auth.currentUser;
            if (!user) {
                showAlert("Por favor, faça login ou crie uma conta para assinar um plano.");
                window.location.href = "/pagina_login.html";
                return;
            }

            const planTitle = button.dataset.planTitle;
            const planPrice = parseFloat(button.dataset.planPrice);
            
            // Verifica se é um parceiro antes de prosseguir
            const partnerRef = doc(db, "partners", user.uid);
            getDoc(partnerRef).then(docSnap => {
                if (docSnap.exists()) {
                    createCheckout(planTitle, planPrice, user.uid, user.email, 'partner_subscription');
                } else {
                    showAlert("Apenas parceiros podem assinar planos. Por favor, cadastre-se como um anunciante.");
                    window.location.href = '/cadastro_anunciantes.html';
                }
            });
        });
    });

    // Lógica de busca
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        const searchResultsSection = document.getElementById('search-results-section');
        const searchResultsGrid = document.getElementById('search-results-grid');
        const noResultsMessage = document.getElementById('no-results-message');
        const mainContent = document.getElementById('main-content');
        const heroSection = document.getElementById('hero-section');
        const clearSearchBtn = document.getElementById('clear-search-btn');

        searchBtn.addEventListener('click', async () => {
            document.getElementById('search-text').classList.add('hidden');
            const searchLoading = document.getElementById('search-loading');
            searchLoading.classList.remove('hidden');
            searchLoading.classList.add('flex');

            try {
                const partnersRef = collection(db, "partners");
                const q = query(partnersRef, where("status", "==", "aprovado"));
                
                const querySnapshot = await getDocs(q);
                const allPartners = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const categoria = document.getElementById('categoria-select').value;
                const destino = document.getElementById('destino-input').value.toLowerCase().trim();

                const results = allPartners.filter(partner => {
                    const matchCategoria = (categoria === 'todos') || (partner.category === categoria);
                    const searchTerms = [
                        partner.businessName?.toLowerCase() || '',
                        partner.city?.toLowerCase() || '',
                        partner.state?.toLowerCase() || '',
                        ...(partner.tags || [])
                    ].join(' ');
                    const matchDestino = (destino === '') || searchTerms.includes(destino);
                    return matchCategoria && matchDestino;
                });

                searchResultsGrid.innerHTML = '';
                if (results.length > 0) {
                    noResultsMessage.classList.add('hidden');
                    results.forEach(partner => {
                        const cardWrapper = document.createElement('a');
                        cardWrapper.href = `ad_details.html?id=${partner.id}`;
                        cardWrapper.className = 'bg-slate-800 rounded-2xl overflow-hidden flex flex-col card-hover';
                        cardWrapper.innerHTML = `
                            <img src="${partner.image || 'https://placehold.co/400x300/1e2b3b/fcd34d?text=SVA'}" alt="${partner.businessName}" class="w-full h-48 object-cover">
                            <div class="p-4 flex flex-col flex-grow">
                                <h3 class="text-lg font-bold text-white">${partner.businessName}</h3>
                                <p class="text-sm text-amber-400 capitalize">${partner.category.replace(/_/g, ' ')}</p>
                                <p class="text-xs text-slate-400 mt-2"><i class="fas fa-map-marker-alt mr-2"></i>${partner.city}, ${partner.state}</p>
                            </div>
                        `;
                        searchResultsGrid.appendChild(cardWrapper);
                    });
                } else {
                    noResultsMessage.classList.remove('hidden');
                }

                mainContent.classList.add('hidden');
                heroSection.classList.add('hidden');
                searchResultsSection.classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (error) {
                console.error("Erro ao buscar dados: ", error);
                showAlert("Não foi possível realizar a busca.");
            } finally {
                document.getElementById('search-text').classList.remove('hidden');
                searchLoading.classList.add('hidden');
                searchLoading.classList.remove('flex');
            }
        });

        clearSearchBtn.addEventListener('click', () => {
            searchResultsSection.classList.add('hidden');
            mainContent.classList.remove('hidden');
            heroSection.classList.remove('hidden');
            document.getElementById('destino-input').value = '';
            document.getElementById('categoria-select').value = 'todos';
        });
    }

    // Lógica da previsão do tempo
    const weatherWidget = document.getElementById('weather-widget');
    if (weatherWidget) {
        // Implementar a busca do clima aqui
    }

    // Lógica do carrossel de parceiros aleatórios
    const advertiserGrid = document.getElementById('advertiser-grid');
    if (advertiserGrid) {
        // Implementar carregamento de parceiros aleatórios
    }
});