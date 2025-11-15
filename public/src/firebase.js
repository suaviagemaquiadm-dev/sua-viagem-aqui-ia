// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

let app, auth, db, functions, storage;

/**
 * Initializes Firebase by fetching the configuration from the reserved URL.
 * This is the recommended secure way for web apps.
 */
async function initializeFirebase() {
    try {
        const response = await fetch('/__/firebase/init.json');
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase config. Ensure Firebase Hosting is set up correctly.');
        }
        const firebaseConfig = await response.json();
        
        // Initialize Firebase with the fetched config
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        functions = getFunctions(app, 'southamerica-east1');
        storage = getStorage(app);

    } catch (error) {
        console.error("Critical Firebase Initialization Error:", error);
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; color: white; background-color: #111827; height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div>
                    <h1>Erro de Configuração</h1>
                    <p>Não foi possível conectar aos nossos serviços. Por favor, tente novamente mais tarde.</p>
                </div>
            </div>`;
        // Stop further script execution
        throw new Error("Firebase init failed");
    }
}

await initializeFirebase();


// Export Firebase services for use in other modules
export { 
    app, 
    auth, 
    db, 
    functions,
    storage
};
