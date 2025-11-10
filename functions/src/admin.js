
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { db, adminAuth, FieldValue, PARTNER_STATUS } = require("../config");
const { deleteCollectionRecursive } = require("./utils");

/**
 * Helper para verificar se o autor da chamada é um administrador.
 * Lança um erro HttpsError 'permission-denied' se não for.
 * @param {object} auth - O objeto de autenticação da requisição v2.
 */
const ensureIsAdmin = (auth) => {
  if (auth?.token?.admin !== true) {
    logger.warn(
      `Usuário não-admin '${auth?.uid || "não autenticado"}' tentou acessar uma função restrita.`,
    );
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem realizar esta ação.",
    );
  }
};

/**
 * Função Callable para criar uma nova conta de parceiro.
 * Protegida para ser chamada apenas por administradores.
 */
exports.createPartnerAccount = onCall(async (request) => {
  ensureIsAdmin(request.auth);

  const { businessName, ownerName, email, password, plan } = request.data;

  if (!businessName || !ownerName || !email || !password || !plan) {
    throw new HttpsError(
      "invalid-argument",
      "Todos os campos são obrigatórios.",
    );
  }

  let userRecord;
  try {
    userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: ownerName,
    });

    await db.collection("partners").doc(userRecord.uid).set({
      uid: userRecord.uid,
      businessName: businessName,
      ownerName: ownerName,
      email: email,
      plan: plan,
      status: "aguardando_aprovacao",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Atribui a custom claim de 'advertiser'
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: "advertiser" });

    return { success: true, message: "Parceiro criado com sucesso!" };
  } catch (error) {
    logger.error("Erro ao criar conta de parceiro:", error);

    // Rollback: se o usuário foi criado no Auth mas a escrita no Firestore falhou, delete o usuário do Auth.
    if (userRecord && userRecord.uid) {
      logger.info(
        `Iniciando rollback para o usuário '${userRecord.uid}' devido a um erro.`,
      );
      await adminAuth.deleteUser(userRecord.uid).catch(err => logger.error(`Falha no rollback do usuário ${userRecord.uid}`, err));
    }

    if (error.code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "O e-mail fornecido já está em uso.",
      );
    }
    throw new HttpsError(
      "internal",
      "Falha ao criar a conta do parceiro.",
      error.message,
    );
  }
});

/**
 * Deleta uma conta de parceiro e todos os seus dados.
 */
exports.deletePartnerAccount = onCall(async (request) => {
    ensureIsAdmin(request.auth);
    const { partnerId } = request.data;
    if (!partnerId) {
        throw new HttpsError("invalid-argument", "O ID do parceiro é obrigatório.");
    }

    try {
        const partnerRef = db.collection("partners").doc(partnerId);
        
        // Deleta subcoleções em paralelo para otimização
        await Promise.all([
            deleteCollectionRecursive(partnerRef.collection("anuncios")),
            deleteCollectionRecursive(partnerRef.collection("posts")),
            deleteCollectionRecursive(partnerRef.collection("reviews"))
        ]);

        await partnerRef.delete();
        logger.info(`Documento e subcoleções do parceiro ${partnerId} deletados.`);

        await adminAuth.deleteUser(partnerId);
        logger.info(`Usuário ${partnerId} deletado do Firebase Authentication.`);
        
        return { success: true, message: "Parceiro e todos os dados associados foram deletados com sucesso." };
    } catch (error) {
        logger.error(`Erro ao deletar conta do parceiro ${partnerId}:`, error);
        if (error.code === 'auth/user-not-found') {
            return { success: true, message: "Dados do parceiro deletados do Firestore. O usuário do Auth não foi encontrado (pode já ter sido removido)." };
        }
        throw new HttpsError("internal", "Erro ao deletar conta do parceiro.", error.message);
    }
});


/**
 * Altera o status de um parceiro.
 */
exports.setPartnerStatus = onCall(async (request) => {
    ensureIsAdmin(request.auth);
    const { partnerId, newStatus, reason } = request.data;

    if (!partnerId || !newStatus || !Object.values(PARTNER_STATUS).includes(newStatus)) {
        throw new HttpsError("invalid-argument", "ID do parceiro ou novo status inválido.");
    }
    
    if (newStatus === PARTNER_STATUS.SUSPENDED && !reason) {
        throw new HttpsError("invalid-argument", "Um motivo é obrigatório para suspender um parceiro.");
    }

    try {
        const partnerRef = db.collection("partners").doc(partnerId);
        await partnerRef.update({ status: newStatus });

        // TODO: Implementar lógica de notificação por e-mail para o parceiro.
        // Ex: sendEmail(partnerEmail, 'Status Alterado', `Seu status foi alterado para ${newStatus}. Motivo: ${reason || 'N/A'}`);

        return { success: true, message: `Status do parceiro alterado para ${newStatus}.` };
    } catch (error) {
        logger.error(`Erro ao alterar status do parceiro ${partnerId}:`, error);
        throw new HttpsError("internal", "Não foi possível alterar o status do parceiro.");
    }
});

/**
 * Concede o papel de administrador a um usuário.
 */
exports.grantAdminRole = onCall(async (request) => {
  ensureIsAdmin(request.auth);

  const email = request.data.email;
  if (!email) {
    throw new HttpsError("invalid-argument", "O e-mail do usuário é obrigatório.");
  }

  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.setCustomUserClaims(user.uid, { admin: true, role: 'admin' });

    await db.collection("users").doc(user.uid).set(
      { role: "admin", updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    return { success: true, message: `Usuário ${email} agora é um administrador.` };
  } catch (error) {
    logger.error("Erro ao conceder papel de administrador:", error);
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "Usuário com o e-mail fornecido não encontrado.");
    }
    throw new HttpsError("internal", "Erro ao conceder privilégios de administrador.", error.message);
  }
});

/**
 * Revoga o papel de administrador de um usuário.
 */
exports.revokeAdminRole = onCall(async (request) => {
  ensureIsAdmin(request.auth);

  const { targetUid } = request.data;
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "O UID do usuário é obrigatório.");
  }
  
  if (targetUid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Um administrador não pode revogar os próprios privilégios.");
  }

  try {
    // Salvaguarda: impede a remoção do último administrador.
    const listUsersResult = await adminAuth.listUsers();
    const admins = listUsersResult.users.filter((u) => u.customClaims?.admin === true);
    if (admins.length <= 1 && admins[0]?.uid === targetUid) {
      throw new HttpsError("failed-precondition", "Não é possível revogar o privilégio do último administrador.");
    }

    const user = await adminAuth.getUser(targetUid);
    await adminAuth.setCustomUserClaims(user.uid, { admin: false, role: 'traveler' });

    await db.collection("users").doc(user.uid).set(
      { role: "traveler", updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    return { success: true, message: `Privilégios de administrador revogados para ${user.email}.` };
  } catch (error) {
    logger.error("Erro ao revogar papel de administrador:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Erro ao revogar privilégios de administrador.", error.message);
  }
});

/**
 * Lista os administradores atuais.
 */
exports.listAdmins = onCall(async (request) => {
  ensureIsAdmin(request.auth);

  try {
    const listUsersResult = await adminAuth.listUsers();
    const admins = [];
    listUsersResult.users.forEach((userRecord) => {
      if (userRecord.customClaims && userRecord.customClaims.admin) {
        admins.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        });
      }
    });
    return admins;
  } catch (error) {
    logger.error("Erro ao listar administradores:", error);
    throw new HttpsError("internal", "Erro ao listar administradores.", error.message);
  }
});
