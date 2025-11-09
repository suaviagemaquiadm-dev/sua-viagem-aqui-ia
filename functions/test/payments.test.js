
const test = require("firebase-functions-test")(
  {
    projectId: "gemini-cli-98f4a",
  },
  "test/service-account.json",
);
const { assert } = require("chai");
const sinon = require("sinon");
const crypto = require("crypto");

// Mock 'mercadopago' antes de ser importado pelo arquivo de funções.
const mercadopago = {
  configure: sinon.stub(),
  payment: {
    findById: sinon.stub(),
  },
  preferences: {
    create: sinon.stub(),
  },
};

// --- Mock de Configuração via Proxyquire ---
const WEBHOOK_SECRET = "test-secret-12345";
const ACCESS_TOKEN = "test-access-token";
const originalConfig = require("../config");

// Mocks para os serviços do firebase-admin
const adminAuthStub = { setCustomUserClaims: sinon.stub().resolves() };
const updateStub = sinon.stub().resolves();
const docStub = sinon.stub().returns({ update: updateStub });
const collectionStub = sinon.stub().returns({ doc: docStub });
const dbStub = { collection: collectionStub };

const proxyquire = require("proxyquire").noCallThru();

// Importa as funções a serem testadas usando proxyquire para injetar os mocks
const {
  createMercadoPagoPreference,
  mercadoPagoWebhook,
} = proxyquire("../src/payments.js", {
  mercadopago: mercadopago,
  // Injeta uma versão mockada do config para controlar os valores dos segredos e stubs do DB/Auth
  "../config": {
    ...originalConfig,
    db: dbStub,
    adminAuth: adminAuthStub,
    mpWebhookSecret: { value: () => WEBHOOK_SECRET },
    mpAccessToken: { value: () => ACCESS_TOKEN },
  },
});

describe("Payments Cloud Functions", () => {
  beforeEach(() => {
    // Reseta o histórico de todos os stubs antes de cada teste
    sinon.resetHistory();
    mercadopago.payment.findById.resetHistory();
    mercadopago.preferences.create.resetHistory();
    adminAuthStub.setCustomUserClaims.resetHistory();
    updateStub.resetHistory();
    docStub.resetHistory();
    collectionStub.resetHistory();
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

      mercadopago.payment.findById.resolves({
        body: {
          status: "approved",
          external_reference: "partner123",
          metadata: { transaction_type: "partner_subscription" },
        },
      });

      await mercadoPagoWebhook(req, res);

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
      req.headers["x-signature"] = `${validTimestamp},v1=${"0".repeat(64)}`; // Assinatura inválida com tamanho correto
      const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };

      await mercadoPagoWebhook(req, res);

      assert.isTrue(res.status.calledWith(400), "Deveria retornar status 400");
      assert.isTrue(res.send.calledWith({ status: "ERROR", message: "Assinatura do Webhook inválida." }));
    });

    it("deve rejeitar um webhook com timestamp expirado (ataque de replay)", async () => {
      const req = generateValidRequest();
      const requestId = req.headers["x-request-id"];
      const paymentId = req.body.data.id;
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // > 300 segundos atrás
      const manifest = `id:${paymentId};request-id:${requestId};ts:${oldTimestamp};`;
      const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
      hmac.update(manifest);
      const signature = hmac.digest("hex");
      req.headers["x-signature"] = `ts=${oldTimestamp},v1=${signature}`;
      const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };

      await mercadoPagoWebhook(req, res);

      assert.isTrue(res.status.calledWith(400), "Deveria retornar status 400");
      assert.isTrue(res.send.calledWith({ status: "ERROR", message: "Timestamp da assinatura expirado." }));
    });

     it("deve ignorar webhooks que não são do tópico 'payment'", async () => {
        const req = {
          method: "POST",
          query: { topic: "other" },
          body: { data: { id: "123" } },
        };
        const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };
        await mercadoPagoWebhook(req, res);
        assert.isTrue(res.status.calledWith(200), "Deveria retornar status 200 para tópicos ignorados");
        assert.isTrue(res.send.calledWith({ status: "Ignored" }));
    });
  });

  describe("createMercadoPagoPreference", () => {
    it("deve criar uma preferência para um usuário autenticado", async () => {
      const wrapped = test.wrap(createMercadoPagoPreference);
      const context = { auth: { uid: "user123", token: {} } };
      const data = {
        title: "Test Plan",
        price: 9.99,
        userId: "user123",
        email: "test@user.com",
        transactionType: "user_subscription",
      };

      mercadopago.preferences.create.resolves({ body: { id: "pref_123" } });

      const result = await wrapped(data, context); // Chamada de função v1

      assert.deepStrictEqual(result, { preferenceId: "pref_123" });
      assert.isTrue(mercadopago.preferences.create.calledOnce);
      const preferenceArg = mercadopago.preferences.create.firstCall.args[0];
      assert.equal(preferenceArg.external_reference, "user123");
      assert.equal(preferenceArg.metadata.transaction_type, "user_subscription");
      assert.equal(preferenceArg.items[0].unit_price, 9.99);
    });

    it("deve lançar 'unauthenticated' se o usuário não estiver logado", async () => {
      const wrapped = test.wrap(createMercadoPagoPreference);
      try {
        await wrapped({}, {}); // Chamada de função v1 sem auth
        assert.fail("A função deveria ter lançado um erro");
      } catch (err) {
        assert.equal(err.code, "unauthenticated");
      }
    });

    it("deve lançar 'invalid-argument' se os dados estiverem faltando", async () => {
      const wrapped = test.wrap(createMercadoPagoPreference);
      const context = { auth: { uid: "user123", token: {} } };
      try {
        await wrapped({ title: "Incomplete" }, context); // Chamada de função v1 com dados incompletos
        assert.fail("A função deveria ter lançado um erro");
      } catch (err) {
        assert.equal(err.code, "invalid-argument");
      }
    });
  });
});

