# Vistiendome — servidor

API del sistema: catálogo, inventario, clientes, cotizaciones, órdenes de
corte, contenido del sitio, medios y estadísticas.

## Tecnología

FastAPI, SQLModel sobre PostgreSQL 16 (driver psycopg 3) y Alembic para las
migraciones. Pruebas con pytest.

## Estructura

| Carpeta | Contenido |
|---|---|
| `app/main.py` | Punto de entrada: registra las rutas y el middleware |
| `app/api/v1/` | Rutas, una por área (`products`, `crm`, `taller`, `media`…) |
| `app/models/` | Tablas de la base |
| `app/core/` | Configuración, seguridad y reglas compartidas |
| `app/scripts/` | Tareas de mantenimiento: `verificar_medios` comprueba que cada foto registrada exista en disco (la usan el respaldo y la restauración) y `restablecer_acceso` cambia la contraseña de una cuenta del panel |
| `alembic/versions/` | Migraciones. La primera crea el esquema completo desde `alembic/esquema_base.sql`; la siguiente carga los datos maestros |
| `tests/` | Pruebas |

Las fotos subidas se guardan en `media/`, que en producción es un volumen de
Docker. La base guarda el registro de cada foto y el disco guarda el archivo,
por eso se respaldan siempre juntos (ver `docs/OPERACION.md` en la raíz).

## Comandos

Todo se ejecuta desde esta carpeta, con el entorno virtual `venv/`. La
configuración se lee del `.env` de la raíz del proyecto.

```bash
./venv/Scripts/alembic upgrade head                      # aplicar migraciones
./venv/Scripts/alembic revision --autogenerate -m "..."  # crear una migración
./venv/Scripts/uvicorn app.main:app --reload --port 8000
./venv/Scripts/python -m pytest
```

En Linux/macOS, `venv/bin/` en lugar de `venv/Scripts/`.

Con el servidor levantado, la documentación interactiva de la API está en
`/docs`.
