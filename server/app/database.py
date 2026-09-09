import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

# Buscar el .env una carpeta arriba (en la raíz del proyecto)
base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(os.path.dirname(base_path), ".env")
load_dotenv(env_path)

# Ya no necesitamos forzar PGCLIENTENCODING, psycopg v3 lo maneja nativamente mejor.

# URL de conexión usando el nuevo driver psycopg (v3)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# EL REGISTRO DE CONSULTAS SOLO EN DESARROLLO
#
# `echo=True` escribe al log CADA consulta SQL, entera, con sus parametros. En
# desarrollo eso es util. En produccion estaba escribiendo parrafos de SELECT
# por cada visita a la portada: escritura a disco constante, un log donde no se
# encuentra un error de verdad entre el ruido, y datos de las clientas -sus
# nombres, sus direcciones, lo que compraron- copiados en texto plano a un
# archivo que nadie mira.
#
# Se toma de APP_ENV, que ya decide otras cosas del mismo tipo y que en el
# servidor esta en "production".
from app.core.config import settings

engine = create_engine(
    DATABASE_URL,
    echo=settings.is_dev,
)

def init_db():
    """
    Crea las tablas que falten. SOLO EN DESARROLLO.

    QUIEN MANDA SOBRE EL ESQUEMA ES ALEMBIC
    En produccion el esquema lo aplica `entrypoint.prod.sh` con
    `alembic upgrade head`, antes de arrancar la API, y si falla el contenedor
    no levanta. Esa es la fuente de verdad y tiene que haber una sola.

    `create_all` en produccion era una segunda fuente compitiendo con esa:
    creaba en silencio las tablas de cualquier modelo nuevo que no tuviera
    migracion, y a partir de ahi la base real y el historial de migraciones
    contaban cosas distintas sin que nadie se enterara. El proximo que corriera
    `alembic upgrade` en una base limpia se encontraba con otro esquema.

    Aqui queda para el arranque a mano en desarrollo, donde levantar rapido una
    base vacia si sirve.

    Se quito ademas un `ALTER TABLE cotizaciones ALTER COLUMN transporte` que se
    ejecutaba en CADA arranque con su error tragado por un print. Esa migracion
    ya existe en Alembic (`e5f6a7b8c9d0_transporte_varchar`) y en el servidor la
    columna ya es VARCHAR(100): estaba rehaciendo a mano algo hecho.
    """
    if not settings.is_dev:
        return
    SQLModel.metadata.create_all(engine)

def get_session():
    """Generador de sesiones para FastAPI (Dependency Injection)"""
    with Session(engine) as session:
        yield session
