let map;
//let myPositionMarker;
let sidePanelOpen = false;
let orderPanelExpanded = false;


//const apiBase = "http://localhost:8000";

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login-register.html";  // 🚀 если не залогинен — на страницу логина
  } else {
    initMap();
    setupUI(); // если токен есть — показываем карту и интерфейс
    loadCourierName(); // загружаем имя курьера
  }
});

function initMap() {
  map = L.map('map').setView([42.98306, 47.50472], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  L.marker([42.98306, 47.50472]).addTo(map)
    .bindPopup("Ваше текущее положение")
    .openPopup();
}

function setupUI() {
  const menuBtn = document.querySelector('.menu-btn');
  const sidePanel = document.querySelector('.side-panel');
  const overlay = document.querySelector('.overlay');

  menuBtn.addEventListener('click', () => {
    sidePanelOpen = !sidePanelOpen;
    sidePanel.classList.toggle('open', sidePanelOpen);
    overlay.classList.toggle('active', sidePanelOpen);
  });

  overlay.addEventListener('click', () => {
    sidePanelOpen = false;
    sidePanel.classList.remove('open');
    overlay.classList.remove('active');
  });

  // 👉 Кнопка выхода
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('courier_id');
    window.location.href = 'login-register.html';
  });

  // 👉 Клик по аватарке с именем
  document.getElementById('courier-profile').addEventListener('click', () => {
    alert("Открыть профиль курьера (пока заглушка)");
  });

  // Панель заказа
  const orderPanel = document.querySelector('.order-panel');
  const orderPanelHandle = document.querySelector('.order-panel-handle');

  orderPanelHandle.addEventListener('click', () => {
    orderPanelExpanded = !orderPanelExpanded;
    orderPanel.classList.toggle('expanded', orderPanelExpanded);
  });

  let startY = 0;
  let currentY = 0;

  orderPanel.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, {passive: true});

  orderPanel.addEventListener('touchmove', (e) => {
    currentY = e.touches[0].clientY;

    if (orderPanelExpanded && currentY - startY > 50) {
      orderPanelExpanded = false;
      orderPanel.classList.remove('expanded');
    } else if (!orderPanelExpanded && startY - currentY > 50) {
      orderPanelExpanded = true;
      orderPanel.classList.add('expanded');
    }
  }, {passive: true});

  document.querySelector('.btn.start').addEventListener('click', () => {
    alert('Маршрут начат!');
  });

  document.querySelector('.btn.complete').addEventListener('click', () => {
    alert('Заказ доставлен!');
  });
}



// 👉 Загружаем имя и статус курьера из API
async function loadCourierName() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch("http://localhost:8000/couriers/me", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      document.getElementById("courier-name").textContent = data.name || "Без имени";
      localStorage.setItem('courier_id', data.id);

      // выставляем состояние ползунка
      const statusToggle = document.getElementById('status-toggle');
      const statusLabel = document.getElementById('status-label');

      statusToggle.checked = data.status === "avail";
      statusLabel.textContent = data.status;

    } else {
      document.getElementById("courier-name").textContent = "Ошибка загрузки";
    }
  } catch (err) {
    document.getElementById("courier-name").textContent = "Сервер недоступен";
  }
}

// 👉 обработчик переключателя статуса
const statusToggle = document.getElementById('status-toggle');
const statusLabel = document.getElementById('status-label');

statusToggle.addEventListener('change', async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const newStatus = statusToggle.checked ? "avail" : "unavail";

  try {
    const res = await fetch("http://localhost:8000/couriers/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      statusLabel.textContent = newStatus;
    } else {
      statusToggle.checked = !statusToggle.checked;  // откатываем
      alert("Не удалось сменить статус");
    }
  } catch (err) {
    statusToggle.checked = !statusToggle.checked;
    console.error("Ошибка соединения с сервером");
  }
});




// // Запуск трекинга геолокации курьера
// function startTracking() {
//     if (!navigator.geolocation) {
//         alert("Geolocation не поддерживается");
//         return;
//     }
//
//     navigator.geolocation.watchPosition(
//         (position) => {
//             const lat = position.coords.latitude;
//             const lon = position.coords.longitude;
//
//             updateCourierMarker(lat, lon);
//
//             // Отправляем позицию на сервер (опционально)
//             fetch(`${apiBase}/tracking/update_position`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     courier_id: 1,  // сюда подставь свой айди курьера
//                     latitude: lat,
//                     longitude: lon
//                 })
//             }).then(resp => resp.json())
//               .then(data => console.log("✅ Позиция отправлена", data))
//               .catch(err => console.error("Ошибка отправки:", err));
//
//         },
//         (err) => console.error("Ошибка геолокации:", err),
//         { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
//     );
// }
//
// // Отображение или обновление маркера на карте
// function updateCourierMarker(lat, lon) {
//     if (myPositionMarker) {
//         myPositionMarker.setLatLng([lat, lon]);
//     } else {
//         const icon = L.divIcon({
//             html: "🚶‍♂️",
//             className: "emoji-icon",
//             iconSize: [30, 30],
//             iconAnchor: [15, 15]
//         });
//         myPositionMarker = L.marker([lat, lon], { icon: icon }).addTo(map);
//     }
// }
