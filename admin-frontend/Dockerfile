# 1 Билдим React
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# 2 Запускаем Nginx для отдачи статики
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80