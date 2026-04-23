import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment
base_path = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(os.path.dirname(os.path.dirname(base_path)), ".env")
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres")

engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as connection:
        print("Eliminando columna 'is_global' de la tabla 'attribute'...")
        try:
            connection.execute(text("ALTER TABLE attribute DROP COLUMN IF EXISTS is_global;"))
            connection.commit()
            print("Limpieza de DB completada con éxito.")
        except Exception as e:
            print(f"Error durante la migración: {e}")

if __name__ == "__main__":
    migrate()
