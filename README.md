# Vistiendome

Tienda en línea y sistema de gestión para un taller de confección: catálogo
público con carrito y cotizaciones, y un panel de administración para el
catálogo, el inventario, los clientes, las órdenes de corte y el contenido del
sitio.

## Componentes

| Carpeta | Qué es | Tecnología |
|---|---|---|
| `client/` | Sitio público y panel de administración | React 19 + Vite |
| `server/` | API, reglas de negocio y migraciones de la base | Python + FastAPI + SQLModel + Alembic |
| `nginx/` | Proxy de producción (sitio, `/api`, `/ws`, `/media`) | nginx |
| `scripts/` | Despliegue, respaldo y restauración en el servidor | bash |

La base de datos es PostgreSQL 16 y corre en Docker, tanto en desarrollo como
en producción.

## Desarrollo local

Requisitos: Docker, Python 3.12, Node 22 y yarn.

```bash
# 1. Base de datos (Postgres en el puerto 5433 del equipo)
docker compose up -d db

# 2. Servidor: crear el .env en la raíz a partir de .env.example, y luego
cd server
python -m venv venv
./venv/Scripts/pip install -r requirements.txt   # en Linux/macOS: venv/bin/pip
./venv/Scripts/alembic upgrade head
./venv/Scripts/uvicorn app.main:app --reload --port 8000

# 3. Cliente (en otra terminal)
cd client
yarn install
yarn dev
```

El cliente reenvía `/api`, `/ws` y `/media` al servidor. Si el servidor no
corre en el puerto 8000, se indica con la variable `VITE_API_BASE`
(por ejemplo `VITE_API_BASE=http://127.0.0.1:8010 yarn dev`).

La documentación de la API queda disponible en `/docs` del servidor
(por ejemplo `http://127.0.0.1:8000/docs`).

## Pruebas

```bash
(cd server && ./venv/Scripts/python -m pytest)
(cd client && yarn test)
```

## Producción

Instalación, despliegue, respaldos, restauración y mudanza de servidor:
[docs/OPERACION.md](docs/OPERACION.md).
