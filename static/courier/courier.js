let map;
let sidePanelOpen = false;
let orderPanelExpanded = false;
let wsCourier;

// для трекинга
let myPositionMarker = null;
let lastSentTime = 0;
const apiBase = "/api"





// ========================== ОСНОВНОЙ КОД ========================== //

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login-register.html";
  } else {
    initMap();
    setupUI();

    // Загружаем имя и статус курьера
    await loadCourierName();

    // После загрузки данных активируем кнопку
    setupStatusButton();

  }
});


function initMap() {
  map = L.map('map').setView([42.98306, 47.50472], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
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

  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('courier_id');
    window.location.href = 'login-register.html';
  });

  document.getElementById('courier-profile').addEventListener('click', () => {
    alert("Открыть профиль курьера (пока заглушка)");
  });

  // 👉 История заказов
document.querySelector('.side-panel').addEventListener('click', async (e) => {
  if (e.target.textContent.includes("История заказов")) {
    await showOrderHistory();
  }
});

// закрытие окна истории
document.addEventListener('click', (e) => {
  if (e.target.id === "close-history") {
    document.getElementById("order-history").classList.add("hidden");
  }
});

// загрузка и отображение завершённых заказов
async function showOrderHistory() {
  const courierId = localStorage.getItem("courier_id");
  if (!courierId) return;

  try {
    const res = await fetch(`${apiBase}/couriers/${courierId}/orders`);
    if (!res.ok) throw new Error("Ошибка загрузки заказов");

    const orders = await res.json();
    const completed = orders.filter(o => o.status === "completed");

    const historyList = document.getElementById("history-list");
    if (completed.length === 0) {
      historyList.innerHTML = "<p>Нет завершённых заказов</p>";
    } else {
      historyList.innerHTML = completed.map(o => `
        <div class="history-item">
          <p><strong>Адрес:</strong> ${o.address}</p>
          <p><strong>Получатель:</strong> ${o.recipient_name}</p>
          <p><strong>Комментарий:</strong> ${o.comment || '—'}</p>
          <p style="font-size:12px;color:gray;"><em>Статус:</em> ${o.status}</p>
        </div>
      `).join("");
    }

    document.getElementById("order-history").classList.remove("hidden");
  } catch (err) {
    console.error("Ошибка загрузки истории заказов:", err);
  }
}

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

  document.querySelector('.order-panel').addEventListener('click', async (e) => {
    if (e.target.classList.contains('complete')) {
      const orderId = localStorage.getItem("active_order_id");
      const token = localStorage.getItem("token");
      if (!orderId || !token) return;

      try {
        const res = await fetch(`${apiBase}/orders/${orderId}/complete`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          alert("✅ Заказ успешно доставлен!");
          document.querySelector('.order-panel').style.display = 'none';
          localStorage.removeItem("active_order_id");
        } else {
          alert("❌ Ошибка при завершении заказа");
        }
      } catch (err) {
        console.error("Ошибка при соединении с сервером", err);
      }
    }

  });
}

function setupStatusButton() {
  const btn = document.getElementById("status-toggle-btn");
  const token = localStorage.getItem("token");

  if (!btn || !token) return;

  btn.addEventListener("click", async () => {
    const current = localStorage.getItem("courier_status") === "avail" ? "unavail" : "avail";
    console.log("Меняю статус на:", current);

    try {
      const res = await fetch(`${apiBase}/couriers/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: current })
      });

      if (res.ok) {
        localStorage.setItem("courier_status", current); // сохраняем в localStorage
        updateStatusDisplay(current); // обновляем UI
      } else {
        alert("Не удалось обновить статус");
      }
    } catch (err) {
      alert("Ошибка соединения");
    }
  });
}



function updateStatusDisplay(status) {
  console.log("Отображаю статус:", status);

  const btn = document.getElementById("status-toggle-btn");
  if (!btn) return;

  btn.textContent = `Статус: ${status === "avail" ? "online" : "offline"}`;
  btn.classList.remove("online", "offline");
  btn.classList.add(status === "avail" ? "online" : "offline");
}

async function loadCourierName() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${apiBase}/couriers/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      document.getElementById("courier-name").textContent = data.name || "Без имени";
      localStorage.setItem('courier_id', data.id);

      // Берём статус из сервера, а не обнуляем
      if (data.status) {
        localStorage.setItem('courier_status', data.status);
        updateStatusDisplay(data.status);
      } else {
        // Если сервер ничего не прислал — берём локальный или unavail
        const savedStatus = localStorage.getItem('courier_status') || "unavail";
        updateStatusDisplay(savedStatus);
      }

      // 👉 Здесь запускаем WebSocket, когда id уже точно есть
      initCourierWebSocket(data.id);

    } else {
      document.getElementById("courier-name").textContent = "Ошибка загрузки";
      updateStatusDisplay(localStorage.getItem('courier_status') || "unavail");
    }

  } catch (err) {
    console.error("Ошибка загрузки курьера:", err);
    document.getElementById("courier-name").textContent = "Сервер недоступен";
    updateStatusDisplay(localStorage.getItem('courier_status') || "unavail");
  }
}

// 👉 Функция инициализации 📡 WebSocket для передачи позиции
function initCourierWebSocket(courierId) {
  wsCourier = new WebSocket(`${window.location.origin.replace(/^http/, "ws")}/tracking/ws/courier/${courierId}`);

  wsCourier.onopen = () => {
    console.log("✅ Курьер подключён к WebSocket");
    startTracking(courierId); // запуск трекинга только после подключения
  };

  wsCourier.onclose = () => {
    console.warn("⚠️ WebSocket закрыт, позиции не отправляются");
  };

  wsCourier.onerror = (err) => {
    console.error("Ошибка WebSocket:", err);
  };

  // если надо будет слушать от сервера — добавь сюда wsCourier.onmessage
}


// ========================== ТРЕКИНГ ========================== //


function startTracking(courierId) {
    if (!navigator.geolocation) {
        alert("Geolocation не поддерживается вашим браузером");
        return;
    }

    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            updateCourierMarker(lat, lon);

            const now = Date.now();
            if (now - lastSentTime > 5000) { // каждые 5 сек
                if (wsCourier && wsCourier.readyState === WebSocket.OPEN) {
                    wsCourier.send(JSON.stringify({
                        courier_id: courierId,
                        latitude: lat,
                        longitude: lon
                    }));
                    console.log("📡 Позиция отправлена через WebSocket:", lat, lon);
                } else {
                    console.warn("⚠️ WebSocket закрыт, позиции не отправляются");

                    // 🔄 РЕЗЕРВНЫЙ ВАРИАНТ: отправка через fetch (можно включить при необходимости)
                    /*
                    fetch(`${apiBase}/tracking/update_position`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem("token")}`
                        },
                        body: JSON.stringify({
                            courier_id: courierId,
                            latitude: lat,
                            longitude: lon
                        })
                    })
                    .then(resp => resp.json())
                    .then(data => console.log("✅ Позиция отправлена (fetch)", data))
                    .catch(err => console.error("Ошибка отправки через fetch:", err));
                    */
                }
                lastSentTime = now;
            }
        },
        (err) => console.error("Ошибка геолокации:", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

function updateCourierMarker(lat, lon, accuracy = 15) {
    // если уже есть маркер — двигаем его
    if (myPositionMarker) {
        myPositionMarker.setLatLng([lat, lon]);
        if (myAccuracyCircle) {
            myAccuracyCircle.setLatLng([lat, lon]);
            myAccuracyCircle.setRadius(accuracy);
        }
    } else {
        // создаём кастомную иконку (заметную)
        const blueDot = L.divIcon({
            html: '<div style="width: 18px; height: 18px; background: #007BFF; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,255,0.7);"></div>',
            className: "courier-marker",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        });

        myPositionMarker = L.marker([lat, lon], { icon: blueDot }).addTo(map);
        myAccuracyCircle = L.circle([lat, lon], {
            radius: accuracy,
            color: "#007BFF",
            fillColor: "#007BFF",
            fillOpacity: 0.15,
            weight: 1
        }).addTo(map);
    }

    // центрируем карту на новую позицию (но не слишком резко)
    map.setView([lat, lon], map.getZoom());
}


// ========================== шторка с заказом/ми ========================== //
// 👉 Режим ручного выбора заказов
const manualPanel = document.getElementById("order-list-panel");

document.querySelectorAll('input[name="mode"]').forEach(input => {
  input.addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'manual') {
      loadAvailableOrders();
    } else if (mode === 'auto') {
      hideOrderListPanel();
      checkNearestOrder();
    }
  });
});

function hideOrderListPanel() {
  manualPanel.classList.remove("active");
}

// 👉 Загрузка доступных заказов
async function loadAvailableOrders() {
  try {
    const res = await fetch(`${apiBase}/orders/available`);
    if (res.ok) {
      const orders = await res.json();
      const content = document.getElementById('order-list-content');

      content.innerHTML = "";

      if (orders.length === 0) {
        content.innerHTML = "<p style='color:white;'>Нет доступных заказов</p>";
      } else {
        orders.forEach(order => {
          const div = document.createElement('div');
          div.classList.add('order-item');
          div.innerHTML = `
            <p><strong>Адрес:</strong> ${order.address}</p>
            <p><strong>Получатель:</strong> ${order.recipient_name}</p>
            <button class="btn-assign" data-id="${order.id}">Взять</button>
          `;
          content.appendChild(div);
        });

        document.querySelectorAll('.btn-assign').forEach(btn => {
          btn.addEventListener('click', async () => {
            const orderId = btn.getAttribute('data-id');
            await assignOrderManually(orderId);
          });
        });
      }

      manualPanel.classList.add("active");
    } else {
      alert("Не удалось загрузить заказы");
    }
  } catch (err) {
    console.error("Ошибка загрузки заказов", err);
  }
}

// 👉 Назначение вручную
async function assignOrderManually(orderId) {
  try {
    const token = localStorage.getItem("token");

    const resCourier = await fetch(`${apiBase}/couriers/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const courier = await resCourier.json();

    const res = await fetch(`${apiBase}/orders/${orderId}/assign/${courier.id}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.ok) {
      hideOrderListPanel();
      loadActiveOrder();
    } else {
      const error = await res.text();
      alert("Ошибка при назначении заказа: " + error);
      console.error("Назначение заказа не удалось:", error);
    }
  } catch (err) {
    console.error("Ошибка назначения", err);
  }
}

// 👉 Проверка активного заказа (периодически)
setInterval(checkAssignedOrder, 5000);

async function checkAssignedOrder() {
  const courierId = localStorage.getItem("courier_id");
  if (!courierId) return;

  const res = await fetch(`${apiBase}/couriers/${courierId}/orders`);
  if (res.ok) {
    const orders = await res.json();
    const activeOrder = orders.find(o => o.status === "assigned");
    if (activeOrder) {
      showOrderInPanel(activeOrder);
    }
  }
}

// 👉 Автоматический режим
async function checkNearestOrder() {
  const courierId = localStorage.getItem("courier_id");
  if (!courierId) return;

  const res = await fetch(`${apiBase}/orders/nearest/${courierId}`);
  if (res.ok) {
    const order = await res.json();
    if (order.id) {
      showOrderInPanel(order);
    }
  }
}

// 👉 Отображение текущего заказа
function showOrderInPanel(order) {
  document.querySelector('.order-panel').style.display = 'block';
  document.querySelector('.order-card').innerHTML = `
    <h3>Текущий заказ</h3>
    <p><strong>Адрес:</strong> ${order.address}</p>
    <p><strong>Получатель:</strong> ${order.recipient_name}</p>
    <p><strong>Телефон:</strong> ${order.recipient_phone}</p>
    <p><strong>Комментарий:</strong> ${order.comment}</p>
    <button class="btn start">Начать маршрут</button>
    <button class="btn complete">Доставлено</button>
  `;
  localStorage.setItem("active_order_id", order.id);
}

// 👉 Загрузка активного заказа вручную
async function loadActiveOrder() {
  const courierId = localStorage.getItem("courier_id");
  if (!courierId) return;

  const res = await fetch(`${apiBase}/couriers/${courierId}/orders`);
  if (res.ok) {
    const orders = await res.json();
    const activeOrder = orders.find(o => o.status === "assigned");
    if (activeOrder) {
      showOrderInPanel(activeOrder);
    }
  }
}
