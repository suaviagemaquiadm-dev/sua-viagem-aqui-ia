import { db, collection, query, where, getDocs } from './firebase-init.js';
import { showAlert } from './ui/alert.js';

/**
 * Configura o preenchimento automático de endereço a partir de um campo de CEP.
 * @param {string} cepFieldId ID do campo de input do CEP.
 * @param {string} cityFieldId ID do campo de input da Cidade.
 * @param {string} stateFieldId ID do campo de input do Estado.
 */
export function setupCepAutofill(cepFieldId, cityFieldId, stateFieldId) {
    const cepInput = document.getElementById(cepFieldId);
    if (!cepInput) return;

    cepInput.addEventListener('blur', async () => {
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep.length !== 8) {
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('CEP não encontrado');
            
            const data = await response.json();
            if (data.erro) {
                showAlert('CEP não encontrado. Por favor, verifique o número digitado.');
                return;
            }

            document.getElementById(cityFieldId).value = data.localidade;
            document.getElementById(stateFieldId).value = data.uf;

        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            showAlert('Não foi possível buscar o CEP. Por favor, preencha a cidade e o estado manualmente.');
        }
    });
}


/**
 * Configura a verificação de e-mail em tempo real para evitar duplicatas.
 * @param {string} emailFieldId ID do campo de input do E-mail.
 */
export function setupRealtimeEmailCheck(emailFieldId) {
    const emailInput = document.getElementById(emailFieldId);
    if (!emailInput) return;

    let debounceTimer;
    emailInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const email = emailInput.value.trim();
            if (email.length < 5 || !email.includes('@')) return;

            const usersRef = collection(db, "users");
            const partnersRef = collection(db, "partners");

            const qUsers = query(usersRef, where("email", "==", email));
            const qPartners = query(partnersRef, where("email", "==", email));

            const [userSnapshot, partnerSnapshot] = await Promise.all([
                getDocs(qUsers),
                getDocs(qPartners)
            ]);

            const messageEl = document.getElementById('form-message'); // Assume que existe um elemento para mensagens
            if (!userSnapshot.empty || !partnerSnapshot.empty) {
                if (messageEl) {
                    messageEl.textContent = 'Este e-mail já está em uso. Tente fazer login.';
                    messageEl.className = 'p-3 rounded-md bg-yellow-500/20 text-yellow-300 text-sm';
                    messageEl.classList.remove('hidden');
                }
            } else {
                 if (messageEl) {
                    messageEl.classList.add('hidden');
                 }
            }

        }, 500); // Atraso de 500ms para não fazer a consulta a cada tecla
    });
}
