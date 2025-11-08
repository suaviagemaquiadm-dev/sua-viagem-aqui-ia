/**
 * Módulo para exibir um modal de alerta customizado.
 */

let modal, msgEl, closeBtn;

/**
 * Inicializa e cacheia os elementos do modal para melhor performance.
 */
function initAlertElements() {
  if (modal) return; // Já inicializado

  modal = document.getElementById("alert-modal");
  msgEl = document.getElementById("alert-message");
  closeBtn = document.getElementById("alert-close-btn");

  if (modal && closeBtn) {
    closeBtn.onclick = () => modal.classList.add("hidden");
    // Permite fechar clicando fora do conteúdo do modal
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    };
  }
}

/**
 * Exibe o modal de alerta padrão com uma mensagem.
 * @param {string} message - A mensagem a ser exibida.
 */
export function showAlert(message) {
  initAlertElements();

  // Fallback para o alert nativo se o modal não for encontrado no DOM da página
  if (!modal || !msgEl) {
    console.warn("Modal de alerta não encontrado. Usando alert nativo.");
    return alert(message);
  }

  msgEl.textContent = message;
  modal.classList.remove("hidden");
}