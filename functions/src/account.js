
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { db } = require("../config");

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
