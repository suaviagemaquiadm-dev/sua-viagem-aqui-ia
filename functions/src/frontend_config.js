const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { googleMapsApiKey, mpPublicKey } = require("../config");

/**
 * Fornece chaves de API públicas para o frontend de forma segura.
 */
exports.getFrontendConfig = onCall({ secrets: [googleMapsApiKey, mpPublicKey] }, (request) => {
  // A autenticação é uma boa prática para evitar o uso indevido da função,
  // mas pode ser removida se o acesso anônimo for necessário.
  // if (!request.auth) {
  //   throw new HttpsError("unauthenticated", "Autenticação necessária.");
  // }

  const mapsKey = googleMapsApiKey.value();
  const mercadoPagoKey = mpPublicKey.value();
  
  if (!mapsKey || !mercadoPagoKey) {
      throw new HttpsError("internal", "Uma ou mais chaves de API não estão configuradas no servidor.");
  }

  return {
    googleMapsApiKey: mapsKey,
    mercadoPagoPublicKey: mercadoPagoKey,
  };
});