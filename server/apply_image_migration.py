from sqlmodel import create_engine, text
import os

# URL de conexión usando el mismo formato que la app
DATABASE_URL = "postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres"

engine = create_engine(DATABASE_URL)

def apply_migrations():
    with engine.connect() as conn:
        print("Sincronizando base de datos con los nuevos campos...")
        
        # 1. Agregar image_urls a SKU
        try:
            conn.execute(text("ALTER TABLE sku ADD COLUMN image_urls JSON DEFAULT '[]';"))
            print("- Columna 'image_urls' añadida a la tabla 'sku'.")
        except Exception as e:
            print(f"- Error al añadir 'image_urls' (posiblemente ya existe): {e}")
        
        # 2. Agregar config_match a ProductImage
        try:
            conn.execute(text("ALTER TABLE productimage ADD COLUMN config_match JSON DEFAULT '{}';"))
            print("- Columna 'config_match' añadida a la tabla 'productimage'.")
        except Exception as e:
            print(f"- Error al añadir 'config_match' (posiblemente ya existe): {e}")

        # 3. Eliminar color_name de ProductImage (opcional, para limpieza)
        try:
            conn.execute(text("ALTER TABLE productimage DROP COLUMN color_name;"))
            print("- Columna 'color_name' eliminada de 'productimage'.")
        except Exception as e:
            print(f"- Error al eliminar 'color_name': {e}")
            
        conn.commit()
        print("Migración completada con éxito.")

if __name__ == "__main__":
    apply_migrations()
