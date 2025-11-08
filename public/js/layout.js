import { initApp } from './app.js';

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
  } catch (error) {
    console.error(`Failed to load component into '${selector}':`, error);
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
  ]);

  // Inicializa a lógica principal da aplicação (auth, etc.) APÓS o header estar no DOM
  initApp();
}

// Garante que o DOM esteja pronto antes de manipular o layout
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLayout);
} else {
  initLayout();
}
