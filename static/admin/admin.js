let map;

// Базовый API адрес для локального FastAPI
const apiBase = "/api";

let courierMarkers = {};

// При загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadCouriers();
    setInterval(loadAllCouriers, 5000); // обновляем каждые 5 сек

    // Кнопка обновления списка курьеров
    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadCouriers);
    }
});

// === Инициализация карты ===
function initMap() {
    map = L.map('map').setView([42.98306, 47.50472], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// === Загрузка списка курьеров ===
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

// === Трекинг всех курьеров ===
function loadAllCouriers() {
    fetch(`${apiBase}/tracking/all_positions`)
        .then(res => res.json())
        .then(couriers => {
            const onlineCouriers = couriers.filter(c => c.latitude && c.longitude);

            // Удаляем маркеры тех, кто оффлайн
            for (let id in courierMarkers) {
                if (!onlineCouriers.find(c => c.courier_id == id)) {
                    map.removeLayer(courierMarkers[id].marker);
                    map.removeLayer(courierMarkers[id].label);
                    delete courierMarkers[id];
                }
            }

            // Добавляем или обновляем активных
            onlineCouriers.forEach(c => {
                const icon = L.divIcon({
                    html: "🔵", // маркер курьера
                    className: "emoji-icon",
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                if (courierMarkers[c.courier_id]) {
                    // обновляем позицию
                    courierMarkers[c.courier_id].marker.setLatLng([c.latitude, c.longitude]);
                    courierMarkers[c.courier_id].label.setLatLng([c.latitude + 0.00025, c.longitude]);
                } else {
                    // создаем маркер
                    const marker = L.marker([c.latitude, c.longitude], { icon }).addTo(map);

                    // создаем подпись под курьером
                    const label = L.marker([c.latitude + 0.00025, c.longitude], {
                        icon: L.divIcon({
                            className: "courier-label",
                            html: `<div class="courier-label-text">${c.name}</div>`,
                            iconSize: [100, 20],
                            iconAnchor: [50, 20]
                        }),
                        interactive: false
                    }).addTo(map);

                    courierMarkers[c.courier_id] = { marker, label };
                }
            });
        })
        .catch(err => console.error("Ошибка загрузки позиций:", err));
}
