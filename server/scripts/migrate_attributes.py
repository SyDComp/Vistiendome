from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Configuración básica (Copiada de database.py)
DATABASE_URL = "postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres"

engine = create_engine(DATABASE_URL)

def migrate():
    print("Iniciando migración manual de la tabla 'attribute'...")
    
    commands = [
        "ALTER TABLE attribute ADD COLUMN IF NOT EXISTS value_structure JSON DEFAULT '[]';",
        "ALTER TABLE attribute ADD COLUMN IF NOT EXISTS domain JSON DEFAULT '[]';"
    ]
    
    with engine.connect() as conn:
        for cmd in commands:
            try:
                print(f"Ejecutando: {cmd}")
                conn.execute(text(cmd))
                conn.commit()
                print("Éxito.")
            except Exception as e:
                print(f"Error al ejecutar comando: {e}")
                conn.rollback()

if __name__ == "__main__":
    migrate()
