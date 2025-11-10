
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const { db, FieldValue } = require("../config");
const { JSDOM } = require("jsdom");
const DOMPurify = require("dompurify");

const window = new JSDOM("").window;
const purify = DOMPurify(window);

/**
 * Submete uma avaliação para um parceiro.
 */
exports.submitReview = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar logado para avaliar.");
  }

  const { partnerId, rating, comment } = request.data;
  const userId = request.auth.uid;

  if (!partnerId || !rating) {
    throw new HttpsError("invalid-argument", "ID do parceiro e nota são obrigatórios.");
  }
  if (rating < 1 || rating > 5) {
    throw new HttpsError("invalid-argument", "A nota deve ser entre 1 e 5.");
  }
  if (partnerId === userId) {
      throw new HttpsError("failed-precondition", "Você não pode avaliar seu próprio negócio.");
  }

  const reviewRef = db.collection("partners").doc(partnerId).collection("reviews").doc(userId);
  const userRef = db.collection("users").doc(userId);
  
  try {
    const [reviewDoc, userDoc] = await Promise.all([reviewRef.get(), userRef.get()]);

    if (reviewDoc.exists()) {
      throw new HttpsError("already-exists", "Você já avaliou este parceiro.");
    }
    if (!userDoc.exists()) {
        throw new HttpsError("not-found", "Perfil de usuário não encontrado.");
    }

    const userData = userDoc.data();
    const sanitizedComment = comment ? purify.sanitize(comment) : "";

    await reviewRef.set({
      rating,
      comment: sanitizedComment,
      userId,
      userName: userData.name,
      userPhotoURL: userData.photoURL || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Avaliação enviada com sucesso!" };

  } catch (error) {
    logger.error(`Erro ao submeter avaliação para ${partnerId} por ${userId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Erro ao enviar avaliação.");
  }
});


/**
 * Gatilho do Firestore que recalcula a avaliação média de um parceiro
 * sempre que uma avaliação é adicionada, atualizada ou removida.
 */
exports.updatePartnerRating = onDocumentWritten("partners/{partnerId}/reviews/{reviewId}", async (event) => {
    const partnerId = event.params.partnerId;
    const partnerRef = db.collection("partners").doc(partnerId);
    const reviewsRef = partnerRef.collection("reviews");

    try {
        const reviewsSnapshot = await reviewsRef.get();
        const reviews = reviewsSnapshot.docs.map(doc => doc.data());
        
        const reviewCount = reviews.length;
        let averageRating = 0;

        if (reviewCount > 0) {
            const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
            averageRating = totalRating / reviewCount;
        }

        await partnerRef.update({
            reviewCount: reviewCount,
            averageRating: averageRating,
        });

        logger.info(`Avaliação do parceiro ${partnerId} atualizada: ${averageRating.toFixed(2)} (${reviewCount} avaliações).`);

    } catch (error) {
        logger.error(`Erro ao atualizar avaliação do parceiro ${partnerId}:`, error);
    }
});
