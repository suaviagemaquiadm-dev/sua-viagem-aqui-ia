// Este arquivo deve conter funções utilitárias relacionadas a formulários.

export function setupRealtimeEmailCheck(emailInputId) {
  const emailInput = document.getElementById(emailInputId);
  if (!emailInput) {
    console.warn(`Input de e-mail com ID '${emailInputId}' não encontrado.`);
    return;
  }

  emailInput.addEventListener('input', () => {
    // TODO: Implementar lógica de verificação de e-mail em tempo real,
    // por exemplo, verificar formato, ou até mesmo fazer uma chamada
    // assíncrona para verificar se o e-mail já está em uso.
    // Por enquanto, apenas um console.log.
    console.log(`Verificando e-mail em tempo real: ${emailInput.value}`);
  });
}

// Você pode adicionar outras funções utilitárias de formulário aqui.
