# Usa una imagen ligera y moderna de Node.js
FROM node:22-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia dependencias primero (para usar la cache de Docker)
COPY package*.json ./

# Instala dependencias de producción y desarrollo
RUN npm install

# Copia el resto del código del proyecto
COPY . .

# Expone el puerto configurado en .env (4000)
EXPOSE 4000

# Ejecuta migraciones, seeders y lanza la API
CMD ["sh", "-c", "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && npm start"]
