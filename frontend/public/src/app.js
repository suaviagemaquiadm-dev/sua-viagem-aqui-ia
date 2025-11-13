import { initAuth } from "./auth.js";

/**
 * Função principal que inicializa todos os componentes e lógicas globais da aplicação.
 * É chamada pelo layout.js após o header ser carregado.
 */
export function initApp() {
    initAuth();
    // Outras inicializações globais podem ser adicionadas aqui no futuro
}
