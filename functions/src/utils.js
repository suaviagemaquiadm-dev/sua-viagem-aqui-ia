/**
 * Utilitários para Cloud Functions.
 */
const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();

/**
 * Deleta uma coleção inteira no Firestore, incluindo todas as subcoleções.
 * @param {FirebaseFirestore.CollectionReference} collectionRef A referência para a coleção a ser deletada.
 * @param {number} batchSize O número de documentos a serem deletados por lote.
 * @returns {Promise<void>}
 */
async function deleteCollectionRecursive(collectionRef, batchSize = 100) {
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}

module.exports = { deleteCollectionRecursive };
