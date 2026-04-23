import os
import sys
from sqlalchemy import text
from sqlmodel import create_engine

# Asegurar que podemos importar desde app
base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(base_path)

from app.database import engine

def migrate():
    print("Iniciando migración para filtros dinámicos...")
    
    with engine.connect() as conn:
        # 1. Agregar is_filterable a Category
        try:
            print("Agregando columna 'is_filterable' a la tabla 'category'...")
            conn.execute(text("ALTER TABLE category ADD COLUMN is_filterable BOOLEAN DEFAULT TRUE;"))
            conn.commit()
            print("Columna 'is_filterable' añadida a 'category'.")
        except Exception as e:
            print(f"Error o ya existe en category: {e}")
            conn.rollback()

        # 2. Agregar is_filterable a Characteristic (tabla 'attribute')
        try:
            print("Agregando columna 'is_filterable' a la tabla 'attribute'...")
            conn.execute(text("ALTER TABLE attribute ADD COLUMN is_filterable BOOLEAN DEFAULT TRUE;"))
            conn.commit()
            print("Columna 'is_filterable' añadida a 'attribute'.")
        except Exception as e:
            print(f"Error o ya existe en characteristic: {e}")
            conn.rollback()

    print("Migración completada con éxito.")

if __name__ == "__main__":
    migrate()
