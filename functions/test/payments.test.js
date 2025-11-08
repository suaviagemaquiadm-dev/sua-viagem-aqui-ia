const test = require("firebase-functions-test")(
  {
    projectId: "gemini-cli-98f4a",
  },
  "test/service-account.json",
);
const assert = require("assert");
const sinon = require("sinon");
const crypto = require("crypto");
const mercadopago = require("mercadopago");

// Importa a função que queremos testar
const { mercadoPagoWebhook } = require("../src/payments");

describe("Payments Cloud Functions", () => {
  let mpStub, cryptoStub;

  // Mock do segredo do webhook
  const WEBHOOK_SECRET = "test-secret";

  beforeEach(() => {
    // Stub para a API do Mercado Pago
    mpStub = sinon.stub(mercadopago.Payment.prototype, "get");

    // Stub para o defineSecret
    process.env.MERCADOPAGO_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    test.cleanup();
  });

  describe("mercadoPagoWebhook", () => {
    it("deve processar um webhook válido com sucesso (status 200)", async () => {
      const paymentId = "12345";
      const requestId = "test-request-id";
      const timestamp = Math.floor(Date.now() / 1000);

      // 1. Gera uma assinatura válida para o teste
      const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
      const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
      hmac.update(manifest);
      const signature = hmac.digest("hex");

      // 2. Simula a requisição recebida pelo webhook
      const req = {
        headers: {
          "x-request-id": requestId,
          "x-signature": `ts=${timestamp},v1=${signature}`,
        },
        query: { topic: "payment" },
        body: {
          data: { id: paymentId },
        },
      };

      // 3. Mock da resposta da API do Mercado Pago
      mpStub.resolves({
        id: paymentId,
        status: "approved",
        external_reference: "user123",
        metadata: { transaction_type: "user_subscription" },
      });

      // 4. Simula o objeto de resposta do Express
      const res = {
        status: sinon.stub().returnsThis(),
        send: sinon.stub(),
      };

      // 5. Executa a função
      await mercadoPagoWebhook(req, res);

      // 6. Asserts - Verifica se a resposta foi de sucesso
      assert.ok(res.status.calledWith(200), "Deveria retornar status 200");
      assert.ok(
        res.send.calledWith({ status: "OK" }),
        "Deveria enviar uma resposta de OK",
      );
    });

    it("deve rejeitar um webhook com assinatura inválida (status 400)", async () => {
      const req = {
        headers: {
          "x-request-id": "some-id",
          "x-signature": `ts=${Math.floor(Date.now() / 1000)},v1=invalid_signature`,
        },
        query: { topic: "payment" },
        body: { data: { id: "12345" } },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        send: sinon.stub(),
      };

      await mercadoPagoWebhook(req, res);

      assert.ok(res.status.calledWith(400), "Deveria retornar status 400");
      assert.ok(
        res.send.calledWith({
          status: "ERROR",
          message: "Assinatura do Webhook inválida.",
        }),
        "Deveria enviar uma mensagem de erro de assinatura inválida",
      );
    });

    it("deve rejeitar um webhook com timestamp expirado (ataque de replay)", async () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutos atrás
      const req = {
        headers: {
          "x-request-id": "some-id",
          "x-signature": `ts=${expiredTimestamp},v1=some_signature`,
        },
        query: { topic: "payment" },
        body: { data: { id: "12345" } },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        send: sinon.stub(),
      };

      await mercadoPagoWebhook(req, res);

      assert.ok(res.status.calledWith(400), "Deveria retornar status 400");
      assert.ok(
        res.send.calledWith({
          status: "ERROR",
          message: "Timestamp da assinatura expirado.",
        }),
        "Deveria enviar uma mensagem de erro de timestamp expirado",
      );
    });

    it("deve ignorar webhooks que não são do tópico 'payment'", async () => {
      const req = { query: { topic: "other_topic" }, body: {} };
      const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };

      await mercadoPagoWebhook(req, res);

      assert.ok(
        res.status.calledWith(200),
        "Deveria retornar status 200 para tópicos ignorados",
      );
    });
  });
});