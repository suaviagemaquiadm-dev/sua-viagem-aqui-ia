import { protectPage } from "/src/auth-guard.js";
import { db } from "/src/firebase.js";
import {
  onSnapshot,
  doc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let usersChartInstance, partnersChartInstance;

// Protege a página e inicializa o painel se o usuário for um administrador
protectPage('admin', () => {
    const dashboardContent = document.getElementById("dashboard-content");
    if (dashboardContent) {
        dashboardContent.classList.remove("hidden");
    }

    // Renderiza os gráficos com dados históricos
    renderCharts();

    // Ouve as métricas em tempo real
    listenToMetrics();
});

/**
 * Ouve o documento de métricas no Firestore e atualiza os cards do dashboard.
 */
function listenToMetrics() {
    const metricsRef = doc(db, "stats", "metrics");
    onSnapshot(metricsRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("total-users").textContent = data.totalUsers || 0;
            document.getElementById("total-partners").textContent = data.totalPartners || 0;
            document.getElementById("itineraries-generated").textContent = data.itinerariesGenerated || 0;
            document.getElementById("reviews-submitted").textContent = data.reviewsSubmitted || 0;
        } else {
            console.warn("Documento de métricas não encontrado em 'stats/metrics'!");
        }
    }, (error) => {
        console.error("Erro ao ouvir métricas:", error);
    });
}


/**
 * Busca os dados diários e renderiza os gráficos de evolução.
 */
async function renderCharts() {
    try {
        const dailyStatsRef = collection(db, "stats", "metrics", "daily");
        const q = query(dailyStatsRef, orderBy("date", "desc"), limit(15));
        const querySnapshot = await getDocs(q);

        const dailyData = {};
        querySnapshot.forEach((doc) => {
            dailyData[doc.id] = doc.data();
        });

        const labels = [];
        const usersData = [];
        const partnersData = [];

        for (let i = 14; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateString = d.toISOString().split("T")[0];
            labels.push(dateString);

            const dataForDay = dailyData[dateString];
            usersData.push(dataForDay?.newUsers || 0);
            partnersData.push(dataForDay?.newPartners || 0);
        }

        const chartOptions = {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: "#94a3b8", stepSize: 1 },
                    grid: { color: "#334155" },
                },
                x: {
                    ticks: { color: "#94a3b8" },
                    grid: { color: "#334155" },
                },
            },
            plugins: {
                legend: { display: false },
            },
        };

        // Gráfico de Usuários
        const usersCtx = document.getElementById("users-chart")?.getContext("2d");
        if (usersCtx) {
            if (usersChartInstance) usersChartInstance.destroy();
            usersChartInstance = new Chart(usersCtx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Novos Usuários",
                        data: usersData,
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59, 130, 246, 0.2)",
                        fill: true,
                        tension: 0.3,
                    }],
                },
                options: chartOptions,
            });
        }
        
        // Gráfico de Parceiros
        const partnersCtx = document.getElementById("partners-chart")?.getContext("2d");
        if (partnersCtx) {
            if (partnersChartInstance) partnersChartInstance.destroy();
            partnersChartInstance = new Chart(partnersCtx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Novos Parceiros",
                        data: partnersData,
                        borderColor: "#22c55e",
                        backgroundColor: "rgba(34, 197, 94, 0.2)",
                        fill: true,
                        tension: 0.3,
                    }],
                },
                options: chartOptions,
            });
        }
    } catch (error) {
        console.error("Erro ao renderizar gráficos:", error);
    }
}
