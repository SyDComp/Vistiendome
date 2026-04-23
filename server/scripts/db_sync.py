import sys
import os
from sqlalchemy import text, create_engine
from sqlmodel import SQLModel, create_engine as sm_create_engine

# Permitir importaciones de la app
sys.path.append(os.path.abspath('.'))
from app.database import engine
from app.models.catalog import * # Cargar modelos para SQLModel metadata

def surgical_sync():
    print("Iniciando sincronización quirúrgica de base de datos...")
    
    with engine.connect() as conn:
        with conn.begin():
            # 1. Agregar 'extras' a 'product' (Reemplazo de metadata)
            print("- Verificando columna 'extras' en la tabla 'product'")
            conn.execute(text('ALTER TABLE product ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT \'{}\''))
            
            # 2. Agregar 'barcode' a 'sku'
            print("- Verificando columna 'barcode' en la tabla 'sku'")
            conn.execute(text('ALTER TABLE sku ADD COLUMN IF NOT EXISTS barcode VARCHAR'))
            
            # 3. Crear índice único para barcode
            print("- Asegurando índice único para barcodes")
            try:
                conn.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_sku_barcode ON sku (barcode)'))
            except Exception as e:
                print(f"  (Aviso: El índice ya existe o no se pudo crear: {e})")
            
            # 4. Agregar 'is_global' a 'attribute'
            print("- Verificando columna 'is_global' en la tabla 'attribute'")
            conn.execute(text('ALTER TABLE attribute ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE'))
            
            # 5. Crear tabla de enlace 'categoryattributelink'
            print("- Verificando tabla de enlace 'categoryattributelink'")
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS categoryattributelink (
                    category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
                    attribute_id INTEGER NOT NULL REFERENCES attribute(id) ON DELETE CASCADE,
                    PRIMARY KEY (category_id, attribute_id)
                )
            '''))
            
    print("Sincronizacion completada con exito.")

if __name__ == "__main__":
    surgical_sync()
