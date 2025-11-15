
const test = require("firebase-functions-test")();
const { assert } = require("chai");
const sinon = require("sinon");
const crypto = require("crypto");
const proxyquire = require("proxyquire").noCallThru();

// Stubs for V2 functions to allow direct handler testing.
const onCallStub = (options, handler) => handler || options;
const onRequestStub = (options, handler) => handler || options;

// Mock 'mercadopago' before it's imported by the functions file.
const mercadopagoMock = {
  configure: sinon.stub(),
  payment: {
    findById: sinon.stub(),
  },
  preferences: {
    create: sinon.stub(),
  },
};

const WEBHOOK_SECRET = "test-secret-12345";
const ACCESS_TOKEN = "test-access-token";

// Mocks for firebase-admin services
const adminAuthStub = { setCustomUserClaims: sinon.stub() };
const updateStub = sinon.stub();
const docStub = sinon.stub();
const collectionStub = sinon.stub();
const dbStub = { collection: collectionStub };
const { HttpsError } = require("firebase-functions/v2/https");
const originalConfig = require("../config");


// Import the functions to be tested using proxyquire to inject mocks
const paymentsFunctions = proxyquire(
  "../payments.js",
  {
    "firebase-functions/v2/https": { onCall: onCallStub, onRequest: onRequestStub, HttpsError },
    mercadopago: mercadopagoMock,
    "./config": { 
      ...originalConfig,
      db: dbStub,
      adminAuth: adminAuthStub,
      mpWebhookSecret: { value: () => WEBHOOK_SECRET },
      mpAccessToken: { value: () => ACCESS_TOKEN },
    },
  },
);

describe("Payments Cloud Functions (V2)", () => {
  beforeEach(() => {
    // Reset history and behavior of all stubs before each test
    sinon.reset();
    // Re-establish default stub behaviors that were cleared by sinon.reset()
    docStub.returns({ update: updateStub });
    collectionStub.returns({ doc: docStub });
    adminAuthStub.setCustomUserClaims.resolves();
    updateStub.resolves();
  });

  after(() => {
    sinon.restore();
    test.cleanup();
  });

  describe("mercadoPagoWebhook", () => {
    function generateValidRequest(paymentId = "12345") {
      const requestId = `req-${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
      const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
      hmac.update(manifest);
      const signature = hmac.digest("hex");

      return {
        headers: {
          "x-request-id": requestId,
          "x-signature": `ts=${timestamp},v1=${signature}`,
        },
        method: "POST",
        query: { topic: "payment" },
        body: { data: { id: paymentId } },
      };
    }

    it("deve processar um webhook válido com sucesso (status 200)", async () => {
      const req = generateValidRequest();
      const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };

      mercadopagoMock.payment.findById.resolves({
        body: {
          status: "approved",
          external_reference: "partner123",
          metadata: { transaction_type: "partner_subscription" },
        },
      });

      await paymentsFunctions.mercadoPagoWebhook(req, res);

      assert.isTrue(res.status.calledWith(200), "Deveria retornar status 200");
      assert.isTrue(res.send.calledWith({ status: "OK" }));
      assert.isTrue(collectionStub.calledWith("partners"));
      assert.isTrue(docStub.calledWith("partner123"));
      assert.isTrue(updateStub.calledWith({ status: "aprovado", payment_status: "pago" }));
      assert.isTrue(adminAuthStub.setCustomUserClaims.calledWith("partner123", { role: "advertiser" }));
    });

    it("deve rejeitar um webhook com assinatura inválida (status 400)", async () => {
      const req = generateValidRequest();
      const validTimestamp = req.headers["x-signature"].split(',')[0];
      req.headers["x-signature"] = `${validTimestamp},v1=${"0".repeat(64)}`; // Invalid signature
      const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };

      await paymentsFunctions.mercadoPagoWebhook(req, res);

      assert.isTrue(res.status.calledWith(400), "Deveria retornar status 400");
      assert.isTrue(res.send.calledWith({ status: "ERROR", message: "Assinatura do Webhook inválida." }));
    });

    it("deve rejeitar um webhook com timestamp expirado (ataque de replay)", async () => {
      const req = generateValidRequest();
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // > 300s ago
      const manifest = `id:${req.body.data.id};request-id:${req.headers["x-request-id"]};ts:${oldTimestamp};`;
      const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
      hmac.update(manifest);
      const signature = hmac.digest("hex");
      req.headers["x-signature"] = `ts=${oldTimestamp},v1=${signature}`;
      const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };

      await paymentsFunctions.mercadoPagoWebhook(req, res);

      assert.isTrue(res.status.calledWith(400), "Deveria retornar status 400");
      assert.isTrue(res.send.calledWith({ status: "ERROR", message: "Assinatura do Webhook inválida." }));
    });

     it("deve ignorar webhooks que não são do tópico 'payment'", async () => {
        const req = {
          method: "POST",
          query: { topic: "other" },
          body: { data: { id: "123" } },
        };
        const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };
        await paymentsFunctions.mercadoPagoWebhook(req, res);
        assert.isTrue(res.status.calledWith(200), "Deveria retornar status 200 para tópicos ignorados");
        assert.isTrue(res.send.calledWith({ status: "Ignored" }));
    });
  });

  describe("createMercadoPagoPreference", () => {
    it("deve criar uma preferência para um usuário autenticado", async () => {
      const data = {
        title: "Test Plan",
        price: 9.99,
        userId: "user123",
        email: "test@user.com",
        transactionType: "user_subscription",
      };
      const request = {
        data: data,
        auth: { uid: "user123", token: {} },
      };

      mercadopagoMock.preferences.create.resolves({ body: { id: "pref_123" } });

      const result = await paymentsFunctions.createMercadoPagoPreference(request);

      assert.deepStrictEqual(result, { preferenceId: "pref_123" });
      assert.isTrue(mercadopagoMock.preferences.create.calledOnce);
      const preferenceArg = mercadopagoMock.preferences.create.firstCall.args[0];
      assert.equal(preferenceArg.external_reference, "user123");
      assert.equal(preferenceArg.metadata.transaction_type, "user_subscription");
      assert.equal(preferenceArg.items[0].unit_price, 9.99);
    });

    it("deve lançar 'unauthenticated' se o usuário não estiver logado", async () => {
      try {
        await paymentsFunctions.createMercadoPagoPreference({ data: {}, auth: null });
        assert.fail("A função deveria ter lançado um erro");
      } catch (err) {
        assert.equal(err.code, "unauthenticated");
      }
    });

    it("deve lançar 'invalid-argument' se os dados estiverem faltando", async () => {
       const request = {
        data: { title: "Incomplete" },
        auth: { uid: "user123", token: {} },
      };
      try {
        await paymentsFunctions.createMercadoPagoPreference(request);
        assert.fail("A função deveria ter lançado um erro");
      } catch (err) {
        assert.equal(err.code, "invalid-argument");
      }
    });
  });
});
