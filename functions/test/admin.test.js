
const test = require("firebase-functions-test")(
  {
    projectId: "gemini-cli-98f4a", // Use o ID do seu projeto de teste
  },
  "test/service-account.json", // Garanta que este arquivo existe e tem as permissões corretas
);
const { assert } = require("chai");
const admin = require("firebase-admin");
const sinon = require("sinon");

// Importa as funções que queremos testar do ponto de entrada principal do projeto
const myFunctions = require("../index.js");
const { createPartnerAccount, revokeAdminRole } = myFunctions;

describe("Admin Cloud Functions", () => {
  let adminAuthStub, firestoreStub, collectionStub, docStub, setStub;

  beforeEach(() => {
    // Stub completo para admin.auth()
    adminAuthStub = {
      createUser: sinon.stub(),
      deleteUser: sinon.stub().resolves(),
      getUser: sinon.stub(),
      setCustomUserClaims: sinon.stub().resolves(),
      listUsers: sinon.stub(),
    };
    sinon.stub(admin, "auth").returns(adminAuthStub);

    // Stub completo para admin.firestore()
    setStub = sinon.stub();
    docStub = sinon.stub().returns({ set: setStub });
    collectionStub = sinon.stub().returns({ doc: docStub });
    // Stub para admin.firestore que é um getter
    const firestore = sinon.stub().returns({ collection: collectionStub });
    Object.defineProperty(admin, 'firestore', {
        get: () => firestore,
        configurable: true // Permite re-stub
    });
  });

  afterEach(() => {
    sinon.restore();
    test.cleanup();
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
      const context = { auth: { uid: "admin123", token: { admin: true } } };
      const wrapped = test.wrap(createPartnerAccount);

      // Act
      const result = await wrapped(validData, context);

      // Assert
      assert.deepStrictEqual(result, { success: true, message: "Parceiro criado com sucesso!" });
      assert.isTrue(adminAuthStub.createUser.calledOnce);
      assert.isTrue(collectionStub.calledWith("partners"));
      assert.isTrue(docStub.calledWith(fakeUser.uid));
      assert.isTrue(setStub.calledOnce);
      assert.isTrue(adminAuthStub.setCustomUserClaims.calledOnceWith(fakeUser.uid, { role: "advertiser" }));
    });

    it("deve rejeitar a chamada se o usuário não for admin", async () => {
      // Arrange
      const context = { auth: { uid: "notadmin123", token: {} } }; // Sem a claim de admin
      const wrapped = test.wrap(createPartnerAccount);

      // Act & Assert
      try {
        await wrapped(validData, context);
        assert.fail("A função deveria ter lançado um erro de permissão negada");
      } catch (err) {
        assert.equal(err.code, "permission-denied");
        assert.equal(err.message, "Apenas administradores podem realizar esta ação.");
      }
    });

    it("deve fazer o rollback (deletar usuário do Auth) se a escrita no Firestore falhar", async () => {
      // Arrange
      const fakeUser = { uid: "orphanuser", email: "orphan@test.com" };
      adminAuthStub.createUser.resolves(fakeUser);
      setStub.rejects(new Error("Firestore write failed"));
      const context = { auth: { uid: "admin123", token: { admin: true } } };
      const wrapped = test.wrap(createPartnerAccount);

      // Act & Assert
       try {
        await wrapped(validData, context);
        assert.fail("A função deveria ter lançado um erro interno");
       } catch(err) {
        assert.equal(err.code, "internal");
        assert.isTrue(adminAuthStub.deleteUser.calledOnceWith(fakeUser.uid), "A função deleteUser deveria ter sido chamada para o rollback");
       }
    });
  });

  describe("revokeAdminRole", () => {
     it("deve impedir a revogação do último administrador", async () => {
        // Arrange
        const adminUser = { uid: 'admin1', email: 'admin1@test.com', customClaims: { admin: true } };
        adminAuthStub.listUsers.resolves({ users: [adminUser] }); // Apenas um admin na lista
        const context = { auth: { uid: "admin_caller", token: { admin: true } } };
        const wrapped = test.wrap(revokeAdminRole);
        const data = { targetUid: 'admin1' };

        // Act & Assert
        try {
            await wrapped(data, context);
            assert.fail("A função deveria ter lançado um erro de pré-condição falhou");
        } catch(err) {
            assert.equal(err.code, "failed-precondition");
            assert.equal(err.message, "Não é possível revogar o privilégio do último administrador.");
        }
     });
  });
});
