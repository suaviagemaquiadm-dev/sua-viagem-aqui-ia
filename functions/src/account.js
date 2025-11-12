

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const { db, adminAuth, gmailEmail, gmailAppPassword } = require("../config");

/**
 * Generates a unique control code for a user or partner.
 */
exports.generateAndAssignControlCode = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "A função só pode ser chamada por um usuário autenticado.");
    }

    const { userId, userType } = request.data;
    if (!userId || !userType) {
        throw new HttpsError("invalid-argument", "O ID do usuário e o tipo são obrigatórios.");
    }

    const prefix = userType === 'vj' ? 'VJ' : 'AN';
    const collectionName = userType === 'vj' ? 'users' : 'partners';
    
    let controlCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        // Gera um código alfanumérico de 6 dígitos
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        controlCode = `${prefix}-${randomPart}`;

        // Verifica a unicidade em ambas as coleções para garantir que seja globalmente único
        const userQuery = db.collection('users').where('controlCode', '==', controlCode).limit(1);
        const partnerQuery = db.collection('partners').where('controlCode', '==', controlCode).limit(1);

        const [userSnapshot, partnerSnapshot] = await Promise.all([
            userQuery.get(),
            partnerQuery.get()
        ]);
        
        if (userSnapshot.empty && partnerSnapshot.empty) {
            isUnique = true;
        } else {
            attempts++;
        }
    }

    if (!isUnique) {
        logger.error(`Não foi possível gerar um código de controle único para o usuário ${userId} após 10 tentativas.`);
        throw new HttpsError("internal", "Não foi possível gerar um código de controle único. Tente novamente.");
    }

    try {
        const docRef = db.collection(collectionName).doc(userId);
        await docRef.update({ controlCode: controlCode });
        logger.info(`Código de controle ${controlCode} atribuído ao usuário ${userId} na coleção ${collectionName}.`);
        return { success: true, controlCode: controlCode };
    } catch (error) {
        logger.error(`Erro ao atribuir código de controle para ${userId}:`, error);
        throw new HttpsError("internal", "Falha ao salvar o código de controle.");
    }
});


/**
 * Envia um e-mail de redefinição de senha de forma segura, sem revelar se o e-mail existe.
 */
exports.sendPasswordResetEmail = onCall({ secrets: [gmailAppPassword, "GMAIL_EMAIL"], region: "southamerica-east1" }, async (request) => {
    const userGmail = process.env.GMAIL_EMAIL;
    const appPassword = process.env.GMAIL_APP_PASSWORD;
    const email = request.data.email;

    if (!email) {
      throw new HttpsError("invalid-argument", "O e-mail é obrigatório.");
    }

    try {
      const user = await adminAuth.getUserByEmail(email);
      const link = await adminAuth.generatePasswordResetLink(email);

      const mailTransport = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: userGmail,
          pass: appPassword,
        },
      });

      const mailOptions = {
        from: `"Sua Viagem Aqui" <${userGmail}>`,
        to: email,
        subject: "Redefinição de Senha - Sua Viagem Aqui",
        html: `
            <p>Olá ${user.displayName || ''},</p>
            <p>Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo para criar uma nova senha:</p>
            <p><a href="${link}">Redefinir Senha</a></p>
            <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
            <p>Atenciosamente,<br>Equipe Sua Viagem Aqui</p>
        `,
      };

      await mailTransport.sendMail(mailOptions);
      logger.info(`E-mail de redefinição de senha enviado para ${email}.`);

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        logger.info(`Solicitação de redefinição de senha para e-mail não existente: ${email}. Nenhuma ação tomada.`);
      } else {
        logger.error(`Erro ao processar redefinição de senha para ${email}:`, error);
      }
    }
    
    // Sempre retorna sucesso para o cliente para evitar enumeração de usuários.
    return { success: true };
});