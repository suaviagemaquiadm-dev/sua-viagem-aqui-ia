/**
 * Ponto de entrada principal para todas as Cloud Functions.
 * Este arquivo importa e re-exporta todas as funções de seus respectivos módulos,
 * permitindo uma organização de código mais limpa e escalável.
 */

// Funções de Administração
const adminFunctions = require("./src/admin");
exports.createPartnerAccount = adminFunctions.createPartnerAccount;
exports.deletePartnerAccount = adminFunctions.deletePartnerAccount;
exports.setPartnerStatus = adminFunctions.setPartnerStatus;
exports.grantAdminRole = adminFunctions.grantAdminRole;
exports.revokeAdminRole = adminFunctions.revokeAdminRole;
exports.listAdmins = adminFunctions.listAdmins;

// Funções de Contas
const accountFunctions = require("./src/account");
exports.generateAndAssignControlCode = accountFunctions.generateAndAssignControlCode;

// Funções relacionadas a Pagamentos
const paymentFunctions = require("./src/payments");
exports.mercadoPagoWebhook = paymentFunctions.mercadoPagoWebhook;
exports.createMercadoPagoPreference = paymentFunctions.createMercadoPagoPreference;

// Funções relacionadas a Usuários
const userFunctions = require("./src/users");
exports.updateUserProfile = userFunctions.updateUserProfile;
exports.cleanupUserData = userFunctions.cleanupUserData;

// Funções relacionadas à IA
const aiFunctions = require("./src/ai");
exports.generateItinerary = aiFunctions.generateItinerary;

