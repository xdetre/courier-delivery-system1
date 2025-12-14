// Конфигурация API
// Измените эти значения на ваши реальные URL сервера

const isDev = process.env.NODE_ENV === 'development' || __DEV__;

export const API_CONFIG = {
  BASE_URL: isDev 
    ? 'http://192.168.1.68:8000/api'  // Для разработки
    : 'https://your-production-api.com/api',  // Для продакшена
  WS_URL: isDev
    ? 'ws://192.168.1.68:8000/api'  // WebSocket для разработки
    : 'wss://your-production-api.com/api',  // WebSocket для продакшена
};

