
import { initApp } from './app.js';
import { initChatbot } from './chatbot.js';

/**
 * Carrega um componente HTML de um arquivo para um seletor específico no DOM.
 * @param {string} selector O seletor do elemento onde o componente será inserido.
 * @param {string} filePath O caminho para o arquivo .html do componente.
 */
async function loadComponent(selector, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Component not found: ${filePath}`);
    const content = await response.text();
    const element = document.querySelector(selector);
    if (element) element.innerHTML = content;
  } catch (error)
    console.error(`Failed to load component into '${selector}':`, error);
  }
}

/**
 * Inicializa a lógica do banner de consentimento de cookies.
 */
function initCookieBanner() {
  const banner = document.getElementById("cookie-consent-banner");
  const acceptBtn = document.getElementById("accept-cookies-btn");

  if (banner && acceptBtn) {
    // Atraso para evitar que o banner cause CLS (Cumulative Layout Shift)
    setTimeout(() => {
        if (!localStorage.getItem("cookieConsent")) {
            banner.classList.remove("hidden");
        }
    }, 1000);
    
    acceptBtn.addEventListener("click", () => {
      localStorage.setItem("cookieConsent", "true");
      banner.classList.add("hidden");
    });
  }
}

/**
 * Registra o Service Worker para habilitar funcionalidades offline (PWA).
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registrado com sucesso:', registration);
                })
                .catch(error => {
                    console.error('Falha ao registrar o Service Worker:', error);
                });
        });
    }
}


/**
 * Inicializa o layout principal da página, carregando header e footer.
 */
async function initLayout() {
  // Carrega os componentes de layout em paralelo para melhor performance
  await Promise.all([
    loadComponent('#main-header', '/components/header.html'),
    loadComponent('#main-footer', '/components/footer.html'),
    loadComponent('#chatbot-container', '/components/chatbot.html'),
  ]);

  // Inicializa a lógica principal da aplicação (auth, etc.) APÓS o header estar no DOM
  initApp();
  initChatbot();
  initCookieBanner();
  registerServiceWorker();
}

// Garante que o DOM esteja pronto antes de manipular o layout
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLayout);
} else {
  initLayout();
}