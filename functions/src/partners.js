const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { db } = require("../config");

/**
 * Shuffles an array in place.
 * @param {Array} array The array to shuffle.
 * @returns {Array} The shuffled array.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Obtém os dados curados para a página inicial, otimizando a busca.
 */
exports.getHomePageData = onCall(async (request) => {
  // Although public data, requiring auth can prevent abuse of the function.
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Autenticação é necessária para acessar os dados.",
    );
  }

  try {
    const partnersRef = db.collection("partners");
    const q = partnersRef.where("status", "==", "aprovado");
    const snapshot = await q.get();

    if (snapshot.empty) {
      return { premiumPartners: [], basicPartners: [], allPartnersForInfiniteScroll: [] };
    }

    const allApprovedPartners = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const premiumPartners = allApprovedPartners.filter(
      (p) => p.plan === "advance" || p.plan === "plus",
    );
    const basicPartners = allApprovedPartners.filter(
      (p) => p.plan === "basic" || p.plan === "free",
    );

    // Retorna uma seleção aleatória e limitada para a UI
    return {
      premiumPartners: shuffleArray(premiumPartners).slice(0, 10),
      basicPartners: shuffleArray(basicPartners).slice(0, 8),
      allPartnersForInfiniteScroll: shuffleArray(allApprovedPartners).slice(0, 15),
    };
  } catch (error) {
    logger.error("Erro ao buscar dados para a página inicial:", error);
    throw new HttpsError(
      "internal",
      "Não foi possível carregar os dados dos parceiros.",
    );
  }
});
