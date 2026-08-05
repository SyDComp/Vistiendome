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

# El motor de la base de datos con psycopg v3
engine = create_engine(
    DATABASE_URL, 
    echo=True
)

def init_db():
    """Inicializa las tablas en PostgreSQL"""
    SQLModel.metadata.create_all(engine)
    
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE cotizaciones ALTER COLUMN transporte TYPE VARCHAR(100);"))
            conn.commit()
    except Exception as e:
        print(f"Nota en ajuste automático de esquema en init_db: {e}")

def get_session():
    """Generador de sesiones para FastAPI (Dependency Injection)"""
    with Session(engine) as session:
        yield session
