const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { db } = require("../config");

/**
 * Marca todas as notificações não lidas de um usuário como lidas.
 */
exports.markNotificationsAsRead = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar logado.");
  }
  const userId = request.auth.uid;

  try {
    const notificationsRef = db.collection("users").doc(userId).collection("notifications");
    const unreadQuery = notificationsRef.where("read", "==", false);
    const unreadSnapshot = await unreadQuery.get();

    if (unreadSnapshot.empty) {
      return { success: true, message: "Nenhuma notificação para marcar como lida." };
    }

    const batch = db.batch();
    unreadSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    logger.info(`${unreadSnapshot.size} notificações marcadas como lidas para o usuário ${userId}.`);
    return { success: true };

  } catch (error) {
    logger.error(`Erro ao marcar notificações como lidas para o usuário ${userId}:`, error);
    throw new HttpsError("internal", "Não foi possível atualizar as notificações.");
  }
});