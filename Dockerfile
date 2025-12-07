FROM python:3.11

WORKDIR /app

COPY requirements.txt .

# Обновляем pip, setuptools и wheel, чтобы корректно тянулись бинарные колёса
RUN pip install --upgrade pip setuptools wheel

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# поддержка вебсокетов
RUN pip install "uvicorn[standard]" websockets

COPY . .

CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
