
const test = require("firebase-functions-test")();
const { assert } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

// Stubs a V2 onCall function para retornar apenas o handler,
// permitindo o teste direto da lógica de negócio.
const onCallStub = (options, handler) => handler || options;


// Mocks e stubs para dependências
const adminAuthStub = {
  createUser: sinon.stub(),
  deleteUser: sinon.stub(),
  getUser: sinon.stub(),
  getUserByEmail: sinon.stub(),
  setCustomUserClaims: sinon.stub(),
  listUsers: sinon.stub(),
};
const setStub = sinon.stub();
const updateStub = sinon.stub();
const docStub = sinon.stub();
const collectionStub = sinon.stub();
const dbStub = { collection: collectionStub };
const { FieldValue, PARTNER_STATUS } = require("../config"); // Constantes reais

// Importa as funções usando proxyquire para injetar os mocks
const adminFunctions = proxyquire("../admin.js", {
  "firebase-functions/v2/https": { onCall: onCallStub, HttpsError: require("firebase-functions/v2/https").HttpsError },
  "./config": {
    db: dbStub,
    adminAuth: adminAuthStub,
    FieldValue,
    PARTNER_STATUS,
  },
  "./utils": {
    deleteCollectionRecursive: sinon.stub().resolves(),
  },
});

describe("Admin Cloud Functions (V2)", () => {
  after(() => {
    test.cleanup();
  });

  beforeEach(() => {
    sinon.reset(); // Limpa stubs antes de cada teste
    // Re-define o comportamento dos stubs que é limpo pelo sinon.reset()
    docStub.returns({ set: setStub, update: updateStub });
    collectionStub.returns({ doc: docStub });
    adminAuthStub.deleteUser.resolves();
    adminAuthStub.setCustomUserClaims.resolves();
  });

  describe("createPartnerAccount", () => {
    const validData = {
      businessName: "Test Business",
      ownerName: "Test Owner",
      email: "partner@test.com",
      password: "password123",
      plan: "plus",
    };

    it("deve criar um usuário no Auth e um documento no Firestore quando chamado por um admin", async () => {
      // Arrange
      const fakeUser = { uid: "partner123", email: "partner@test.com" };
      adminAuthStub.createUser.resolves(fakeUser);
      setStub.resolves();
      const request = {
        data: validData,
        auth: { uid: "admin123", token: { admin: true } },
      };

      // Act
      const result = await adminFunctions.createPartnerAccount(request);

      // Assert
      assert.deepStrictEqual(result, {
        success: true,
        message: "Parceiro criado com sucesso!",
      });
      assert.isTrue(adminAuthStub.createUser.calledOnce);
      assert.isTrue(docStub.calledWith(fakeUser.uid));
      assert.isTrue(setStub.calledOnce);
      assert.isTrue(
        adminAuthStub.setCustomUserClaims.calledOnceWith(fakeUser.uid, {
          role: "advertiser",
        }),
      );
    });

    it("deve rejeitar a chamada se o usuário não for admin", async () => {
      // Arrange
      const request = {
        data: validData,
        auth: { uid: "notadmin123", token: {} }, // Sem claim de admin
      };

      // Act & Assert
      try {
        await adminFunctions.createPartnerAccount(request);
        assert.fail("A função deveria ter lançado um erro 'permission-denied'");
      } catch (err) {
        assert.equal(err.code, "permission-denied");
      }
    });

    it("deve fazer o rollback (deletar usuário do Auth) se a escrita no Firestore falhar", async () => {
      // Arrange
      const fakeUser = { uid: "orphanuser", email: "orphan@test.com" };
      adminAuthStub.createUser.resolves(fakeUser);
      setStub.rejects(new Error("Firestore write failed"));
      const request = {
        data: validData,
        auth: { uid: "admin123", token: { admin: true } },
      };

      // Act & Assert
      try {
        await adminFunctions.createPartnerAccount(request);
        assert.fail("A função deveria ter lançado um erro 'internal'");
      } catch (err) {
        assert.equal(err.code, "internal");
        assert.isTrue(adminAuthStub.deleteUser.calledOnceWith(fakeUser.uid));
      }
    });
  });

  describe("revokeAdminRole", () => {
    it("deve impedir a revogação do último administrador", async () => {
      // Arrange
      const adminUser = { uid: "admin1", customClaims: { admin: true } };
      adminAuthStub.listUsers.resolves({ users: [adminUser] }); // Apenas um admin
      const request = {
        data: { targetUid: "admin1" },
        auth: { uid: "another_admin_trying_to_delete", token: { admin: true } },
      };

      // Act & Assert
      try {
        await adminFunctions.revokeAdminRole(request);
        assert.fail("A função deveria ter lançado um erro 'failed-precondition'");
      } catch (err) {
        assert.equal(err.code, "failed-precondition");
      }
    });
  });
});