
/**
 * Ponto de entrada principal para todas as Cloud Functions.
 * O código foi refatorado para usar importações diretas, melhorando a clareza,
 * a manutenibilidade e o rastreamento de erros.
 */

// Funções de Administração
const adminFunctions = require("./admin");
exports.createPartnerAccount = adminFunctions.createPartnerAccount;
exports.deletePartnerAccount = adminFunctions.deletePartnerAccount;
exports.setPartnerStatus = adminFunctions.setPartnerStatus;
exports.grantAdminRole = adminFunctions.grantAdminRole;
exports.revokeAdminRole = adminFunctions.revokeAdminRole;
exports.listAdmins = adminFunctions.listAdmins;

// Funções de Contas
// const accountFunctions = require("./account");
// exports.generateAndAssignControlCode = accountFunctions.generateAndAssignControlCode;
// exports.sendPasswordResetEmail = accountFunctions.sendPasswordResetEmail;

// Funções de Pagamentos
const paymentFunctions = require("./payments");
exports.mercadoPagoWebhook = paymentFunctions.mercadoPagoWebhook;
// exports.createMercadoPagoPreference = paymentFunctions.createMercadoPagoPreference;

// Funções de Usuários
const userFunctions = require("./users");
exports.updateUserProfile = userFunctions.updateUserProfile;
exports.cleanupUserData = userFunctions.cleanupUserData;
// exports.toggleFollowUser = userFunctions.toggleFollowUser;

// Funções de IA
// const aiFunctions = require("./ai");
// exports.generateItinerary = aiFunctions.generateItinerary;
// exports.suggestDestination = aiFunctions.suggestDestination;

// Funções de Contato
// const contactFunctions = require("./contact");
// exports.sendContactEmail = contactFunctions.sendContactEmail;

// Funções do Chatbot
// const chatbotFunctions = require("./chatbot");
// exports.askChatbot = chatbotFunctions.askChatbot;

// Funções de Avaliações (Reviews)
// const reviewFunctions = require("./reviews");
// exports.submitReview = reviewFunctions.submitReview;
// exports.updatePartnerRating = reviewFunctions.updatePartnerRating;

// Funções de Analytics
// const analyticsFunctions = require("./analytics");
// exports.trackProfileView = analyticsFunctions.trackProfileView;
// exports.trackWhatsappClick = analyticsFunctions.trackWhatsappClick;

// Funções de Notificações
// const notificationFunctions = require("./notifications");
// exports.markNotificationsAsRead = notificationFunctions.markNotificationsAsRead;

// Funções de Configuração do Frontend
// const frontendConfigFunctions = require("./frontend_config");
// exports.getFrontendConfig = frontendConfigFunctions.getFrontendConfig;

// Funções de Busca
// const searchFunctions = require("./search");
// exports.searchPartners = searchFunctions.searchPartners;

// Funções da Página Inicial
// const partnerFunctions = require("./partners");
// exports.getHomePageData = partnerFunctions.getHomePageData;
