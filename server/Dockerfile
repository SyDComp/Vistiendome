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

# Este CMD casi nunca se usa: el entrypoint arranca uvicorn el mismo, despues de
# aplicar las migraciones. Queda como valor por defecto para quien corra la
# imagen a mano, y por eso NO lleva --reload: eso es modo desarrollo (reinicia
# el proceso ante cualquier cambio de archivo y duplica el uso de memoria), y
# dejarlo escrito aca es dejar una trampa lista para que alguien la pise.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
