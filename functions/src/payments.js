const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v2/https");
const crypto = require("crypto");
const mercadopago = require("mercadopago");
const {
  db,
  adminAuth,
  mpAccessToken,
  mpWebhookSecret,
  ROLES,
  PARTNER_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_TYPES,
} = require("./config");

/**
 * Valida a assinatura do webhook do Mercado Pago para previnir ataques.
 * @param {import("firebase-functions/v2/https").Request} req - O objeto da requisição.
 * @returns {boolean} - Retorna true se a assinatura for válida.
 */
function validateWebhookSignature(req) {
  const signatureHeader = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const webhookSecret = mpWebhookSecret.value();

  if (!signatureHeader || !requestId || !webhookSecret) {
    logger.warn("Webhook validation failed: Missing headers or secret.");
    return false;
  }

  const parts = signatureHeader.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.ts;
  const signature = parts.v1;

  // Previne ataques de replay
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > 300) {
    // 5 minutos de tolerância
    logger.warn("Webhook validation failed: Timestamp expired.");
    return false;
  }

  const manifest = `id:${req.body.data.id};request-id:${requestId};ts:${timestamp};`;
  const hmac = crypto.createHmac("sha256", webhookSecret);
  hmac.update(manifest);
  const computedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature),
  );
}

/**
 * Webhook para receber notificações de pagamento do Mercado Pago.
 */
exports.mercadoPagoWebhook = onRequest(
  {
    region: "southamerica-east1",
    secrets: [mpAccessToken, mpWebhookSecret],
    memory: "256MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    if (req.query.topic !== "payment" || !req.body?.data?.id) {
      logger.info("Webhook received for a non-payment topic or without ID, ignoring.");
      return res.status(200).send({ status: "Ignored" });
    }

    if (!validateWebhookSignature(req)) {
      logger.error("Invalid webhook signature received.");
      return res
        .status(400)
        .send({ status: "ERROR", message: "Assinatura do Webhook inválida." });
    }

    const paymentId = req.body.data.id;
    logger.info(`Processing payment notification for ID: ${paymentId}`);

    try {
      mercadopago.configure({ access_token: mpAccessToken.value() });
      const paymentInfo = await mercadopago.payment.findById(paymentId);

      if (!paymentInfo || !paymentInfo.body) {
        throw new Error("Payment not found in Mercado Pago API.");
      }

      const payment = paymentInfo.body;
      const userId = payment.external_reference;
      const transactionType = payment.metadata.transaction_type;
      
      if (!userId) {
        throw new Error(`Payment ${paymentId} does not have an external_reference (userId).`);
      }

      if (payment.status === 'approved') {
        logger.info(`Payment ${paymentId} was approved. Updating user/partner status.`);
        
        if (transactionType === TRANSACTION_TYPES.USER_SUBSCRIPTION) {
          const userRef = db.collection('users').doc(userId);
          await userRef.update({ 
              role: ROLES.TRAVELER_PLUS, 
              payment_status: PAYMENT_STATUS.PAID 
          });
          // Atualiza as permissões do usuário no Auth para acesso imediato
          await adminAuth.setCustomUserClaims(userId, { role: ROLES.TRAVELER_PLUS });
          logger.info(`User ${userId} updated to TRAVELER_PLUS.`);

        } else if (transactionType === TRANSACTION_TYPES.PARTNER_SUBSCRIPTION) {
          const partnerRef = db.collection('partners').doc(userId);
          await partnerRef.update({
            status: PARTNER_STATUS.APPROVED, 
            payment_status: PAYMENT_STATUS.PAID
          });
          // Atualiza as permissões do usuário no Auth para acesso imediato
          await adminAuth.setCustomUserClaims(userId, { role: ROLES.ADVERTISER });
           logger.info(`Partner ${userId} updated to APPROVED.`);
        }
      } else {
         logger.info(`Payment ${paymentId} status is '${payment.status}'. No action taken.`);
      }

      logger.info(`Payment ${paymentId} for user ${userId} processed successfully.`);
      return res.status(200).send({ status: "OK" });
    } catch (error) {
      logger.error(`Error processing payment ${paymentId}:`, error);
      return res.status(500).send({ status: "ERROR", message: error.message });
    }
  },
);