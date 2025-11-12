import {
  db,
  collection,
  getDocs,
  query,
  where,
  httpsCallable,
  functions,
  auth,
  doc,
  getDoc
} from "./firebase.js";
import { showAlert } from "./ui/alert.js";
import { initAIRouteBuilder } from "./ai.js";
import { AgencyCarousel, InfiniteCarousel, TestimonialsCarousel, initAdvertiserGrid } from "./ui.js";
import { createCheckout } from "./payment.js";
import { initSearch } from "./search.js";


// Inicializa todas as funcionalidades da página principal
function initHomePage() {
  initSearch();
  initAIRouteBuilder();
  initSubscribeButtons();
  loadCarouselsAndGrids();
}


function initSubscribeButtons() {
    document.querySelectorAll('.subscribe-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Impede a navegação do <a>
            const user = auth.currentUser;
            if (!user) {
                showAlert("Por favor, faça login ou crie uma conta para assinar um plano.");
                window.location.href = `/pagina_login.html?redirectTo=${encodeURIComponent(e.currentTarget.href)}`;
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
}


async function loadCarouselsAndGrids() {
    try {
        const q = query(collection(db, "partners"), where("status", "==", "aprovado"));
        const snapshot = await getDocs(q);
        const allPartners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const premiumPartners = allPartners.filter(p => p.plan === 'advance' || p.plan === 'plus');
        const basicPartners = allPartners.filter(p => p.plan === 'basic' || p.plan === 'free');

        // Carrossel de Parceiros Premium (Agências)
        new AgencyCarousel(premiumPartners).init();
        
        // Carrossel Infinito de Parceiros
        new InfiniteCarousel(allPartners).init();

        // Grade de Anunciantes Basic
        initAdvertiserGrid(basicPartners.sort(() => 0.5 - Math.random()).slice(0, 8));

    } catch (error) {
        console.error("Erro ao carregar dados para os carrosséis:", error);
    }

    // Depoimentos (dados mockados por enquanto)
    const testimonialsData = [
       { name: 'Maria S.', role: 'Pousada Aconchego', quote: 'Desde que entramos na plataforma, nossa taxa de ocupação aumentou em 30%. O acesso direto aos viajantes fez toda a diferença!', img: '' },
       { name: 'João P.', role: 'Guia de Ecoturismo', quote: 'A visibilidade que o plano Basic me deu foi incrível. Recebo contatos de clientes que antes eu nem sonhava em alcançar. Recomendo!', img: '' }
    ];
    new TestimonialsCarousel(testimonialsData).init();
}


// Inicia tudo quando o DOM está pronto.
initHomePage();
