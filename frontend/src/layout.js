import { initApp } from "./app.js";
import { initChatbot } from "./chatbot.js";
import { HeaderComponent } from "./components/Header.js";
import { FooterComponent } from "./components/Footer.js";
import { ChatbotComponent } from "./components/Chatbot.js";
import { AlertModalComponent } from "./components/AlertModal.js";

/**
 * Injects a component's HTML into the DOM.
 * @param {string} selector The selector for the target element.
 * @param {function} componentFn The function that returns the component's HTML string.
 */
function renderComponent(selector, componentFn) {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = componentFn();
  } else {
    console.warn(`Target element '${selector}' not found for component.`);
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
 * Inicializa o layout principal da página, carregando header e footer.
 */
async function initLayout() {
  // Renderiza os componentes de layout
  renderComponent("#main-header", HeaderComponent);
  renderComponent("#main-footer", FooterComponent);
  renderComponent("#chatbot-container", ChatbotComponent);

  // Injeta o modal de alerta global no final do body
  document.body.insertAdjacentHTML("beforeend", AlertModalComponent());

  // Inicializa a lógica principal da aplicação (auth, etc.) APÓS os componentes estarem no DOM
  initApp();
  initChatbot();
  initCookieBanner();
}

// Garante que o DOM esteja pronto antes de manipular o layout
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLayout);
} else {
  initLayout();
}
