const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");
const { defineString, defineSecret } = require("firebase-functions/params");

// Inicializa o Firebase Admin SDK
initializeApp();

// Exporta instâncias dos serviços para serem usadas em outros módulos
const db = getFirestore();
const storage = getStorage();
const messaging = getMessaging();
const adminAuth = getAuth();

// Constantes para evitar 'magic strings'
const ROLES = {
  ADMIN: "admin",
  TRAVELER_PLUS: "traveler_plus",
  ADVERTISER: "advertiser",
};

const PARTNER_STATUS = {
  APPROVED: "aprovado",
  PENDING_APPROVAL: "aguardando_aprovacao",
  PENDING_PAYMENT: "aguardando_pagamento",
  SUSPENDED: "suspenso",
  REJECTED: "rejeitado",
};

const PAYMENT_STATUS = {
  PAID: "pago",
  PENDING: "pending",
  REJECTED: "rejected",
};

const TRANSACTION_TYPES = {
  PARTNER_SUBSCRIPTION: "partner_subscription",
  USER_SUBSCRIPTION: "user_subscription",
};

const CONTROL_CODE_PREFIXES = {
  PARTNER: "AN",
  TRAVELER: "VJ",
};

// Parâmetros de ambiente seguro para as chaves de API
const mpAccessToken = defineSecret("MERCADOPAGO_ACCESS_TOKEN");
const openAIKey = defineString("OPENAI_API_KEY");
const telegramToken = defineString("TELEGRAM_TOKEN");
const telegramChatId = defineString("TELEGRAM_CHAT_ID");
const weatherApiKey = defineString("OPENWEATHERMAP_KEY");
const mpWebhookSecret = defineSecret("MERCADOPAGO_WEBHOOK_SECRET");
const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");
const gmailEmail = defineString("GMAIL_EMAIL");
const adminEmail = defineString("ADMIN_EMAIL");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

module.exports = {
  db,
  storage,
  messaging,
  adminAuth,
  FieldValue,
  ROLES,
  PARTNER_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_TYPES,
  CONTROL_CODE_PREFIXES,
  mpAccessToken,
  openAIKey,
  telegramToken,
  telegramChatId,
  weatherApiKey,
  mpWebhookSecret,
  googleMapsApiKey,
  gmailEmail,
  adminEmail,
  gmailAppPassword,
};
