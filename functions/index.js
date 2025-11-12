/**
 * Ponto de entrada principal para todas as Cloud Functions.
 * Este arquivo utiliza "lazy loading" para carregar os módulos de função sob demanda,
 * melhorando a performance de inicialização e prevenindo erros em ambientes de teste.
 */

// Objeto para carregar e armazenar módulos de forma preguiçosa
const functionsMap = {
  admin: null,
  account: null,
  payments: null,
  users: null,
  ai: null,
  contact: null,
  chatbot: null,
  reviews: null,
  analytics: null, // Novo
  notifications: null, // Novo
  frontend_config: null, // Novo
  search: null,
  partners: null,
};

/**
 * Carrega um módulo de função sob demanda para evitar a inicialização de todas as funções de uma vez.
 * @param {keyof functionsMap} moduleName O nome do módulo a ser carregado.
 * @returns {object} O módulo de funções exportado.
 */
function loadFunctions(moduleName) {
  if (functionsMap[moduleName] === null) {
    functionsMap[moduleName] = require(`./src/${moduleName}`);
  }
  return functionsMap[moduleName];
}

// Exporta as funções usando getters para acionar o lazy loading

// Funções de Administração
Object.defineProperty(exports, "createPartnerAccount", { get: () => loadFunctions("admin").createPartnerAccount });
Object.defineProperty(exports, "deletePartnerAccount", { get: () => loadFunctions("admin").deletePartnerAccount });
Object.defineProperty(exports, "setPartnerStatus", { get: () => loadFunctions("admin").setPartnerStatus });
Object.defineProperty(exports, "grantAdminRole", { get: () => loadFunctions("admin").grantAdminRole });
Object.defineProperty(exports, "revokeAdminRole", { get: () => loadFunctions("admin").revokeAdminRole });
Object.defineProperty(exports, "listAdmins", { get: () => loadFunctions("admin").listAdmins });

// Funções de Contas
Object.defineProperty(exports, "generateAndAssignControlCode", { get: () => loadFunctions("account").generateAndAssignControlCode });

// Funções relacionadas a Pagamentos
Object.defineProperty(exports, "mercadoPagoWebhook", { get: () => loadFunctions("payments").mercadoPagoWebhook });
Object.defineProperty(exports, "createMercadoPagoPreference", { get: () => loadFunctions("payments").createMercadoPagoPreference });

// Funções relacionadas a Usuários
Object.defineProperty(exports, "updateUserProfile", { get: () => loadFunctions("users").updateUserProfile });
Object.defineProperty(exports, "cleanupUserData", { get: () => loadFunctions("users").cleanupUserData });
Object.defineProperty(exports, "toggleFollowUser", { get: () => loadFunctions("users").toggleFollowUser });

// Funções relacionadas à IA
Object.defineProperty(exports, "generateItinerary", { get: () => loadFunctions("ai").generateItinerary });
Object.defineProperty(exports, "suggestDestination", { get: () => loadFunctions("ai").suggestDestination });

// Funções de Contato
Object.defineProperty(exports, "sendContactEmail", { get: () => loadFunctions("contact").sendContactEmail });

// Funções do Chatbot
Object.defineProperty(exports, "askChatbot", { get: () => loadFunctions("chatbot").askChatbot });

// Funções de Avaliações (Reviews)
Object.defineProperty(exports, "submitReview", { get: () => loadFunctions("reviews").submitReview });
Object.defineProperty(exports, "updatePartnerRating", { get: () => loadFunctions("reviews").updatePartnerRating });

// Funções de Analytics
Object.defineProperty(exports, "trackProfileView", { get: () => loadFunctions("analytics").trackProfileView });
Object.defineProperty(exports, "trackWhatsappClick", { get: () => loadFunctions("analytics").trackWhatsappClick });

// Funções de Notificações
Object.defineProperty(exports, "markNotificationsAsRead", { get: () => loadFunctions("notifications").markNotificationsAsRead });

// Funções de Configuração do Frontend
Object.defineProperty(exports, "getFrontendConfig", { get: () => loadFunctions("frontend_config").getFrontendConfig });

// Funções de Busca
Object.defineProperty(exports, "searchPartners", { get: () => loadFunctions("search").searchPartners });

// Funções da Página Inicial
Object.defineProperty(exports, "getHomePageData", { get: () => loadFunctions("partners").getHomePageData });
