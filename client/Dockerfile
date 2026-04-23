FROM node:20-alpine

WORKDIR /app

# Copiar configuración de dependencias
COPY package.json yarn.lock* ./

# Instalar dependencias
RUN yarn install

# Copiar el grueso de la aplicación
COPY . .

# Exponer el puerto de Vite
EXPOSE 5173

# Correr en modo desarrollo con host expuesto para Docker
CMD ["yarn", "dev", "--host"]
