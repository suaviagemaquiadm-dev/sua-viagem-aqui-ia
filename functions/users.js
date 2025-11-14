
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { beforeUserDeleted } = require("firebase-functions/v2/auth");
const logger = require("firebase-functions/logger");
const { db, FieldValue } = require("./config");
const { deleteCollectionRecursive } = require("./utils");

/**
 * Função para permitir que um usuário autenticado atualize seu próprio perfil.
 */
exports.updateUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado.",
    );
  }

  const userId = request.auth.uid;
  const { name, photoURL } = request.data;

  // Validação de Schema (Hardening)
  if (name && typeof name !== 'string') {
      throw new HttpsError("invalid-argument", "O nome fornecido é inválido.");
  }
  if (photoURL && typeof photoURL !== 'string') {
      throw new HttpsError("invalid-argument", "A URL da foto é inválida.");
  }
  if (!name && !photoURL) {
    throw new HttpsError(
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
    throw new HttpsError("internal", "Não foi possível atualizar o perfil.");
  }
});

/**
 * Trigger que limpa os dados de um usuário no Firestore e subcoleções
 * ANTES que a conta correspondente seja deletada do Firebase Authentication.
 */
exports.cleanupUserData = beforeUserDeleted(async (event) => {
  const user = event.data;
  const userId = user.uid;
  logger.info(`Iniciando limpeza de dados para o usuário prestes a ser deletado: ${userId}`);

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
    // Não re-lança o erro para não impedir a exclusão do usuário no Auth
    logger.error(`Erro ao limpar dados do usuário ${userId} no Firestore (a exclusão do Auth continuará):`, error);
  }
});

/**
 * Adiciona ou remove um usuário da lista de 'following' do usuário atual
 * e da lista de 'followers' do usuário alvo, de forma transacional.
 */
exports.toggleFollowUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar logado para seguir alguém.");
  }
  
  const currentUserId = request.auth.uid;
  const { targetUserId } = request.data;

  // Validação de Schema (Hardening)
  if (typeof targetUserId !== 'string' || targetUserId.length === 0) {
    throw new HttpsError("invalid-argument", "O ID do usuário alvo é inválido.");
  }

  if (currentUserId === targetUserId) {
    throw new HttpsError("invalid-argument", "Você não pode seguir a si mesmo.");
  }

  const currentUserRef = db.collection("users").doc(currentUserId);
  const targetUserRef = db.collection("users").doc(targetUserId);

  try {
    await db.runTransaction(async (transaction) => {
      const currentUserDoc = await transaction.get(currentUserRef);
      const targetUserDoc = await transaction.get(targetUserRef);

      if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
        throw new HttpsError("not-found", "Usuário não encontrado.");
      }

      const currentUserFollowing = currentUserDoc.data().following || [];
      const isFollowing = currentUserFollowing.includes(targetUserId);

      if (isFollowing) {
        // Unfollow
        transaction.update(currentUserRef, { following: FieldValue.arrayRemove(targetUserId) });
        transaction.update(targetUserRef, { followers: FieldValue.arrayRemove(currentUserId) });
      } else {
        // Follow
        transaction.update(currentUserRef, { following: FieldValue.arrayUnion(targetUserId) });
        transaction.update(targetUserRef, { followers: FieldValue.arrayUnion(currentUserId) });
      }
    });
    
    return { success: true };
  } catch (error) {
    logger.error(`Erro ao seguir/deixar de seguir ${targetUserId} por ${currentUserId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Ocorreu um erro ao processar a solicitação.");
  }
});
