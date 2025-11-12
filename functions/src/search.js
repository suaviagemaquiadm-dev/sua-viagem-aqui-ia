const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { db } = require("../config");

/**
 * Realiza uma busca por parceiros no backend, otimizando a performance.
 */
exports.searchPartners = onCall(async (request) => {
    const { text, category } = request.data;
    const searchText = text ? text.toLowerCase().trim() : '';

    try {
        let query = db.collection("partners").where("status", "==", "aprovado");

        // Filtro de categoria é aplicado no banco de dados para eficiência
        if (category && category !== 'todos') {
            query = query.where("category", "==", category);
        }

        const snapshot = await query.get();
        let partners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filtro de texto é aplicado no servidor para queries mais complexas
        if (searchText) {
            const searchKeywords = searchText.split(' ').filter(k => k.length > 1);
            partners = partners.filter(partner => {
                const partnerText = `
                  ${partner.businessName?.toLowerCase() || ''} 
                  ${partner.city?.toLowerCase() || ''} 
                  ${partner.state?.toLowerCase() || ''} 
                  ${(partner.tags || []).join(' ').toLowerCase()}
                  ${partner.description?.toLowerCase() || ''}
                `.trim();
                return searchKeywords.some(keyword => partnerText.includes(keyword));
            });
        }
        
        // Limita os resultados para evitar sobrecarga e garantir uma resposta rápida
        return partners.slice(0, 50);

    } catch (error) {
        logger.error("Erro na busca de parceiros:", error);
        throw new HttpsError("internal", "Não foi possível realizar a busca.");
    }
});