
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const { db, FieldValue } = require("../config");
const { deleteCollectionRecursive } = require("./utils");

/**
 * Função para permitir que um usuário autenticado atualize seu próprio perfil (v1).
 */
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado.",
    );
  }

  const userId = context.auth.uid;
  const { name, photoURL } = data;

  if (!name && !photoURL) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Pelo menos um campo (name ou photoURL) deve ser fornecido.",
    );
  }

  const dataToUpdate = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (name) dataToUpdate.name = name;
  if (photoURL) dataToUpdate.photoURL = photoURL;

  try {
    const userRef = db.collection("users").doc(userId);
    await userRef.update(dataToUpdate);

    logger.info(`Perfil do usuário ${userId} atualizado com sucesso.`);
    return { success: true, message: "Perfil atualizado com sucesso!" };
  } catch (error) {
    logger.error(`Erro ao atualizar o perfil do usuário ${userId}:`, error);
    throw new functions.https.HttpsError("internal", "Não foi possível atualizar o perfil.");
  }
});

/**
 * Trigger que limpa os dados de um usuário no Firestore e subcoleções
 * DEPOIS que a conta correspondente é deletada do Firebase Authentication (v1).
 */
exports.cleanupUserData = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;
  logger.info(`Iniciando limpeza de dados para o usuário deletado: ${userId}`);

  try {
    const userDocRef = db.collection("users").doc(userId);
    
    // Deleta subcoleções que podem existir
    const itinerariesRef = userDocRef.collection("itineraries");
    const functionCallsRef = userDocRef.collection("function_calls");
    const notificationsRef = userDocRef.collection("notifications");

    await Promise.all([
        deleteCollectionRecursive(itinerariesRef, 100),
        deleteCollectionRecursive(functionCallsRef, 100),
        deleteCollectionRecursive(notificationsRef, 100),
    ]);
    logger.info(`Subcoleções do usuário ${userId} deletadas.`);

    // Deleta o documento principal do usuário no Firestore
    await userDocRef.delete();
    logger.info(`Documento do usuário ${userId} deletado do Firestore.`);
    
  } catch (error) {
    // Não re-lança o erro, pois a exclusão do usuário no Auth já ocorreu.
    logger.error(`Erro ao limpar dados do usuário ${userId} no Firestore:`, error);
  }
});