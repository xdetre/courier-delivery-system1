let map;

// Базовый API адрес для локального FastAPI
const apiBase = "http://localhost:8000";

// При загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadCouriers();

    // Кнопка обновления списка курьеров
    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadCouriers);
    }
});

// Инициализация карты
function initMap() {
    map = L.map('map').setView([42.98306, 47.50472], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// Загрузка списка курьеров
async function loadCouriers() {
    try {
        const response = await fetch(`${apiBase}/couriers`);
        const couriers = await response.json();

        const listDiv = document.getElementById("couriers-list");
        listDiv.innerHTML = "";

        couriers.forEach(courier => {
            const div = document.createElement("div");
            div.className = courier.status === 'avail' ? "courier-item active" : "courier-item inactive";
            div.textContent = `${courier.name} (${courier.status})`;
            listDiv.appendChild(div);
        });

    } catch (error) {
        console.error("Ошибка загрузки курьеров:", error);
    }
}