import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

# Buscar el .env una carpeta arriba (en la raíz del proyecto)
base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(os.path.dirname(base_path), ".env")
load_dotenv(env_path)

# Ya no necesitamos forzar PGCLIENTENCODING, psycopg v3 lo maneja nativamente mejor.

# URL de conexión usando el nuevo driver psycopg (v3)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres")

# El motor de la base de datos con psycopg v3
engine = create_engine(
    DATABASE_URL, 
    echo=True
)

def init_db():
    """Inicializa las tablas en PostgreSQL"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Generador de sesiones para FastAPI (Dependency Injection)"""
    with Session(engine) as session:
        yield session
