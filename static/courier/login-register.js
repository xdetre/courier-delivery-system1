const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const confirmPasswordInput = document.getElementById("confirm-password");
const actionBtn = document.getElementById("action-btn");
const messageDiv = document.getElementById("message");

// 👇 новое поле
const nameInput = document.getElementById("name");

if (localStorage.getItem("token")) {
  window.location.href = "index.html";
}

let mode = "login";

loginTab.addEventListener("click", () => {
  mode = "login";
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  confirmPasswordInput.style.display = "none";
  nameInput.style.display = "none"; // скрываем поле имени
  actionBtn.textContent = "Войти";
  messageDiv.textContent = "";
});

registerTab.addEventListener("click", () => {
  mode = "register";
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  confirmPasswordInput.style.display = "block";
  nameInput.style.display = "block"; // показываем поле имени
  actionBtn.textContent = "Зарегистрироваться";
  messageDiv.textContent = "";
});

actionBtn.addEventListener("click", async () => {
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  const name = nameInput.value.trim();

  // Проверка телефона
  const phoneRegex = /^\+\d{6,15}$/;
  if (!phoneRegex.test(phone)) {
    showMessage("Телефон должен начинаться с '+' и содержать от 6 до 15 цифр");
    return;
  }

  // Проверка пароля
  if (!/^[A-Za-z0-9]+$/.test(password)) {
    showMessage("Пароль должен содержать только латинские буквы и цифры");
    return;
  }

  if (mode === "register" && password !== confirmPassword) {
    showMessage("Пароли не совпадают");
    return;
  }

  if (mode === "register" && !name) {
    showMessage("Введите имя");
    return;
  }

  const url = mode === "login"
    ? "http://localhost:8000/auth/login"
    : "http://localhost:8000/auth/register";

  const payload = mode === "login"
    ? { phone: phone, password: password }
    : { phone: phone, password: password, name: name };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.detail || "Ошибка запроса");
      return;
    }

    if (mode === "login") {
      localStorage.setItem("token", data.access_token);
      window.location.href = "index.html";
    } else {
      showMessage("Регистрация успешна, войдите 👌");
      loginTab.click();
      document.getElementById("phone").value = "";
      document.getElementById("password").value = "";
      confirmPasswordInput.value = "";
      nameInput.value = "";
    }

  } catch (err) {
    showMessage("Сервер недоступен");
  }
});

function showMessage(text) {
  messageDiv.textContent = text;
  messageDiv.style.color = "#fff";
  messageDiv.style.marginTop = "10px";
}
