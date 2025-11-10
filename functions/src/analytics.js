const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { db, FieldValue } = require("../config");

/**
 * Rastreia uma visualização de perfil de parceiro.
 */
exports.trackProfileView = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "A função só pode ser chamada por um usuário autenticado.");
  }

  const { partnerId } = request.data;
  if (!partnerId) {
    throw new HttpsError("invalid-argument", "O ID do parceiro é obrigatório.");
  }

  try {
    const partnerRef = db.collection("partners").doc(partnerId);
    await partnerRef.update({
      profileViews: FieldValue.increment(1),
    });
    return { success: true };
  } catch (error) {
    logger.error(`Erro ao rastrear visualização para o parceiro ${partnerId}:`, error);
    // Não lança erro para o cliente para não quebrar a experiência do usuário.
    return { success: false };
  }
});

/**
 * Rastreia um clique no botão do WhatsApp.
 */
exports.trackWhatsappClick = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "A função só pode ser chamada por um usuário autenticado.");
  }

  const { partnerId } = request.data;
  if (!partnerId) {
    throw new HttpsError("invalid-argument", "O ID do parceiro é obrigatório.");
  }

  try {
    const partnerRef = db.collection("partners").doc(partnerId);
    await partnerRef.update({
      whatsappClicks: FieldValue.increment(1),
    });
    return { success: true };
  } catch (error) {
    logger.error(`Erro ao rastrear clique no WhatsApp para o parceiro ${partnerId}:`, error);
    // Não lança erro para o cliente.
    return { success: false };
  }
});