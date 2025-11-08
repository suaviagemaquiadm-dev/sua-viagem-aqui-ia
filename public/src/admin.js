import {
  db,
  functions,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  signOut,
  httpsCallable,
  auth,
} from '/src/firebase.js';
import { protectPage } from '/src/auth-guard.js';

let allPartnersData = [];
let plansChart;

protectPage('admin', () => {
  setupAdminPanel();
});

function setupAdminPanel() {
  const partnersCol = collection(db, 'partners');
  onSnapshot(partnersCol, (snapshot) => {
    allPartnersData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    updateDashboard(allPartnersData);
    renderPartnersTable(allPartnersData);
  });
}

// --- DASHBOARD ---
function updateDashboard(partners) {
  document.getElementById('total-partners').textContent = partners.length;
  const activePartners = partners.filter((p) => p.status === 'aprovado');
  document.getElementById('active-partners').textContent = activePartners.length;

  const now = new Date();
  const freePlans = activePartners.filter(
    (p) =>
      p.plan === 'free' &&
      p.trialEndDate &&
      p.trialEndDate.toDate &&
      p.trialEndDate.toDate() > now, // Verifica se toDate existe antes de chamar
  );
  document.getElementById('free-plans').textContent = freePlans.length;

  const paidSubscribers = activePartners.filter(
    (p) => p.plan && p.plan !== 'free',
  );
  document.getElementById('paid-subscribers').textContent =
    paidSubscribers.length;

  const pendingPayments = partners.filter(
    (p) => p.status === 'aguardando_pagamento',
  );
  document.getElementById('pending-payments').textContent =
    pendingPayments.length;

  updatePlansChart(partners);
}

function updatePlansChart(partners) {
  const ctx = document.getElementById('plans-chart').getContext('2d');
  const planCounts = partners.reduce((acc, partner) => {
    const plan = partner.plan || 'Nenhum';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  if (plansChart) {
    plansChart.destroy();
  }

  plansChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(planCounts),
      datasets: [
        {
          data: Object.values(planCounts),
          backgroundColor: [
            '#22d3ee',
            '#f59e0b',
            '#84cc16',
            '#ef4444',
            '#6b7280',
          ],
          borderColor: '#1e293b',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#cbd5e1',
          },
        },
      },
    },
  });
}

// --- PARTNERS TABLE & MANAGEMENT ---
function renderPartnersTable(partners) {
  const tableBody = document.getElementById('partners-table-body');
  tableBody.innerHTML = '';
  partners.forEach((partner) => {
    const tr = document.createElement('tr');
    tr.className = 'table-row';

    const statusColors = {
      aprovado: 'text-green-400',
      aguardando_aprovacao: 'text-orange-400',
      aguardando_pagamento: 'text-yellow-400',
      pendente: 'text-cyan-400',
      suspenso: 'text-red-500',
      rejeitado: 'text-red-600',
    };

    tr.innerHTML = `
<td class="p-4 font-medium text-white">${partner.businessName}</td>
<td class="p-4 text-slate-400">${partner.email}</td>
<td class="p-4">
  <span class="font-semibold">${partner.plan || 'Nenhum'}</span>
</td>
<td class="p-4">
  <span class="font-bold ${statusColors[partner.status] || 'text-slate-500'}"
    >${(partner.status || 'desconhecido').replace(/_/g, ' ')}</span
  >
</td>
<td class="p-4 text-center space-x-2">
  <button
    class="edit-btn text-blue-400 hover:text-blue-300"
    data-id="${partner.id}"
  >
    <i class="fas fa-edit"></i>
  </button>
  <select
    class="change-status-select form-input rounded text-xs py-1"
    data-id="${partner.id}"
  >
    <option value="" disabled selected>Mudar Status</option>
    <option value="aprovado">Aprovar</option>
    <option value="suspenso">Suspender</option>
    <option value="rejeitado">Rejeitar</option>
  </select>
  <button
    class="delete-btn text-red-500 hover:text-red-400"
    data-id="${partner.id}"
  >
    <i class="fas fa-trash"></i>
  </button>
</td>
`;
    tableBody.appendChild(tr);
  });
}

document.getElementById('search-partners').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filteredPartners = allPartnersData.filter(
    (p) =>
      p.businessName.toLowerCase().includes(searchTerm) ||
      p.email.toLowerCase().includes(searchTerm),
  );
  renderPartnersTable(filteredPartners);
});

// Event delegation for table actions
document.getElementById('partners-table-body').addEventListener('click', (e) => {
  if (e.target.closest('.delete-btn')) {
    const partnerId = e.target.closest('.delete-btn').dataset.id;
    showConfirmation(
      'Tem a certeza de que quer eliminar este parceiro? Esta ação é irreversível.',
      () => deletePartner(partnerId),
    );
  }
});

document
  .getElementById('partners-table-body')
  .addEventListener('change', (e) => {
    const partnerId = e.target.dataset.id;
    if (e.target.classList.contains('change-status-select')) {
      const newStatus = e.target.value;
      if (newStatus) {
        updatePartner(partnerId, { status: newStatus });
      }
    }
  });

async function updatePartner(id, data) {
  try {
    const partnerRef = doc(db, 'partners', id);
    await updateDoc(partnerRef, data);
    showInfo('Parceiro atualizado com sucesso.');
  } catch (error) {
    console.error('Erro ao atualizar parceiro: ', error);
    showInfo('Erro ao atualizar parceiro.');
  }
}

async function deletePartner(id) {
  // Idealmente, isso deveria chamar uma Cloud Function que também apaga o usuário do Auth.
  // Por simplicidade, estamos apenas apagando do Firestore.
  try {
    await deleteDoc(doc(db, 'partners', id));
    showInfo('Parceiro eliminado com sucesso.');
  } catch (error) {
    console.error('Erro ao eliminar parceiro:', error);
    showInfo('Erro ao eliminar parceiro.');
  }
}

// --- MODALS (Alert, Confirmation) ---
const alertModal = document.getElementById('alert-modal');
function showInfo(message) {
  alertModal.querySelector('#alert-message').textContent = message;
  alertModal.querySelector('#alert-ok-btn').classList.remove('hidden');
  alertModal.querySelector('#alert-confirm-btn').classList.add('hidden');
  alertModal.querySelector('#alert-cancel-btn').classList.add('hidden');
  alertModal.classList.remove('hidden');
}
function showConfirmation(message, onConfirm) {
  alertModal.querySelector('#alert-message').textContent = message;
  alertModal.querySelector('#alert-ok-btn').classList.add('hidden');
  alertModal.querySelector('#alert-confirm-btn').classList.remove('hidden');
  alertModal.querySelector('#alert-cancel-btn').classList.remove('hidden');
  alertModal.classList.remove('hidden');

  const confirmBtn = alertModal.querySelector('#alert-confirm-btn');
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener('click', () => {
    onConfirm();
    alertModal.classList.add('hidden');
  });
}
alertModal
  .querySelector('#alert-cancel-btn')
  .addEventListener('click', () => alertModal.classList.add('hidden'));
alertModal
  .querySelector('#alert-ok-btn')
  .addEventListener('click', () => alertModal.classList.add('hidden'));

// --- ADMIN ACTIONS ---
const createPartnerForm = document.getElementById('create-partner-form');
createPartnerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const createPartnerAccount = httpsCallable(functions, 'createPartnerAccount');
  try {
    await createPartnerAccount({
      businessName: createPartnerForm['create-businessName'].value,
      ownerName: createPartnerForm['create-ownerName'].value,
      email: createPartnerForm['create-email'].value,
      password: createPartnerForm['create-password'].value,
      plan: createPartnerForm['create-plan'].value,
    });
    showInfo('Conta de parceiro criada com sucesso!');
    createPartnerForm.reset();
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    showInfo(`Erro: ${error.message}`);
  }
});

// --- LOGOUT ---
document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth);
});
