export function showAlert(message, type = "error") {
  const alertModal = document.getElementById("alert-modal");
  const alertMessage = document.getElementById("alert-message");
  const alertCloseBtn = document.getElementById("alert-close-btn");

  if (!alertModal || !alertMessage || !alertCloseBtn) {
    console.error("Elementos do modal de alerta não encontrados.");
    alert(message); // Fallback para alert nativo
    return;
  }

  alertMessage.textContent = message;
  // Você pode adicionar lógica para mudar a cor ou ícone baseado no 'type' (e.g., 'success', 'error', 'info')
  // Por exemplo: alertModal.className = `... bg-${type}-500 ...`;

  alertModal.classList.remove("hidden");

  alertCloseBtn.onclick = () => {
    alertModal.classList.add("hidden");
  };

  // Fechar ao clicar fora do modal (opcional)
  alertModal.onclick = (event) => {
    if (event.target === alertModal) {
      alertModal.classList.add("hidden");
    }
  };
}
