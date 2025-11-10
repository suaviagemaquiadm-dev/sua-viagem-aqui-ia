
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const { gmailEmail, gmailAppPassword, adminEmail } = require("../config");

/**
 * Envia um e-mail a partir do formulário de contato.
 */
exports.sendContactEmail = onCall(
  { secrets: [gmailAppPassword, "GMAIL_EMAIL", "ADMIN_EMAIL"], region: "southamerica-east1" },
  async (request) => {
    // Acessa os secrets a partir de process.env
    const userGmail = process.env.GMAIL_EMAIL;
    const adminContactEmail = process.env.ADMIN_EMAIL;
    const appPassword = process.env.GMAIL_APP_PASSWORD;

    if (!userGmail || !appPassword || !adminContactEmail) {
        logger.error("Configuração de e-mail incompleta nos secrets.");
        throw new HttpsError("internal", "O serviço de e-mail não está configurado.");
    }
    
    if (!request.data.name || !request.data.email || !request.data.subject || !request.data.message) {
      throw new HttpsError("invalid-argument", "Todos os campos do formulário são obrigatórios.");
    }
    
    const { name, email, subject, message } = request.data;
    
    const mailTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: userGmail,
        pass: appPassword,
      },
    });

    const mailOptions = {
      from: `"${name}" <${userGmail}>`, // O 'from' deve ser a conta autenticada
      replyTo: email, // O email do remetente real vai aqui
      to: adminContactEmail,
      subject: `[Contato SVA] ${subject}`,
      html: `
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email para Resposta:</strong> ${email}</p>
        <p><strong>Assunto:</strong> ${subject}</p>
        <hr>
        <p><strong>Mensagem:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    };

    try {
      await mailTransport.sendMail(mailOptions);
      logger.info(`E-mail de contato de ${email} enviado com sucesso.`);
      return { success: true, message: "E-mail enviado com sucesso!" };
    } catch (error) {
      logger.error("Falha ao enviar e-mail de contato:", error);
      throw new HttpsError("internal", "Não foi possível enviar a mensagem.");
    }
  }
);
