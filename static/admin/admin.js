let map;

// Базовый API адрес для локального FastAPI
const apiBase = "http://localhost:8000";

let courierMarkers = {};

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


// для трекинга курьера
function loadAllCouriers() {
    fetch(`${apiBase}/tracking/all_positions`)
        .then(res => res.json())
        .then(couriers => {
            couriers.forEach(c => {
                const icon = L.divIcon({
                    html: "🚚",
                    className: "emoji-icon",
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                if (courierMarkers[c.courier_id]) {
                    courierMarkers[c.courier_id].setLatLng([c.latitude, c.longitude]);
                } else {
                    courierMarkers[c.courier_id] = L.marker([c.latitude, c.longitude], { icon })
                        .bindPopup(`<b>${c.name}</b>`)
                        .addTo(map);
                }
            });
        })
        .catch(err => console.error("Ошибка загрузки позиций:", err));
}

// обновление списка каждые 5 сек
setInterval(loadAllCouriers, 5000);