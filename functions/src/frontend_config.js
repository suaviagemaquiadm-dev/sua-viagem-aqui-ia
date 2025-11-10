const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { googleMapsApiKey } = require("../config");

/**
 * Fornece chaves de API públicas para o frontend de forma segura.
 */
exports.getFrontendConfig = onCall({ secrets: [googleMapsApiKey] }, (request) => {
  // A autenticação é uma boa prática para evitar o uso indevido da função.
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticação necessária.");
  }

  const mapsKey = googleMapsApiKey.value();
  if (!mapsKey) {
      throw new HttpsError("internal", "A chave de API do Google Maps não está configurada no servidor.");
  }

  return {
    googleMapsApiKey: mapsKey,
  };
});