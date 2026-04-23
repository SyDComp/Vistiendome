FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2 y utilidades
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requerimientos e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto de la aplicación
COPY . .

# Exponer puerto de FastAPI
EXPOSE 8000

# Comando para correr la app con hot-reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
