# Vistiendome - Backend (Servidor)

API RESTful que potencia la plataforma de e-commerce "Vistiendome", orientada a servir las necesidades del negocio con alto rendimiento.

## 🚀 Tecnologías Principales
- **Framework:** FastAPI (Python)
- **ORM:** SQLModel
- **Base de Datos:** PostgreSQL
- **Migraciones:** Alembic

## 🧠 Estructura y Patrones Clave (Para Humanos y Agentes)

**Nota SDD:** Antes de modificar el código, por favor revisa las especificaciones en `../../agent/server/` para mantener la consistencia arquitectónica.

1. **Arquitectura y Rutas (`app/api/v1/`)**
   - El punto de entrada principal es `app/main.py`.
   - Las rutas están lógicamente separadas en módulos: `auth` (Autenticación JWT), `products` (Catálogo público), `admin` (Panel de control), `cms` (Gestión de portada estática).

2. **Gestión de Base de Datos**
   - Se utiliza **PostgreSQL** como motor principal (configurado vía Docker o variable de entorno `DATABASE_URL`).
   - Los modelos de datos se definen usando `SQLModel` en la carpeta `app/models/`.

3. **Manejo de Medios y Archivos Estáticos**
   - Las imágenes subidas de productos o recursos de la tienda se sirven estáticamente desde la carpeta `/media`. **Precaución al manejar contenedores Docker para no perder este volumen de datos.**

4. **Tiempo Real**
   - Se soporta comunicación bidireccional mediante WebSockets (`app/api/v1/websockets.py`).

5. **Scripts Utilitarios**
   - La raíz del servidor contiene varios scripts (`seed_priscila.py`, `normalize_db.py`, etc.) utilizados para sembrar la base de datos o realizar mantenimiento. Utilizarlos con precaución.

## 🛠 Entorno de Desarrollo (Docker)

La forma recomendada de levantar el backend y su base de datos es utilizando el `docker-compose.yml` que se encuentra en la raíz del monorepo, el cual orquesta FastAPI junto al contenedor de PostgreSQL.
