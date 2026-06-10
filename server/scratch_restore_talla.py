import os
from sqlalchemy import create_engine, text
import json

DATABASE_URL = "postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres"
engine = create_engine(DATABASE_URL)

def run():
    print("Iniciando restauración de Talla...")
    
    # Lista de opciones de tallas
    tallas_domain = ["12", "14", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL"]
    domain_json = json.dumps(tallas_domain)
    
    cmd1 = text("""
    INSERT INTO attribute (name, is_filterable, is_system, domain) 
    VALUES ('Talla', true, false, :domain_json)
    ON CONFLICT (name) DO UPDATE SET domain = EXCLUDED.domain;
    """)
    
    with engine.connect() as conn:
        try:
            conn.execute(cmd1, {"domain_json": domain_json})
            conn.commit()
            print("Atributo 'Talla' insertado/actualizado correctamente en la BD local.")
        except Exception as e:
            print(f"Error al insertar atributo: {e}")
            conn.rollback()

if __name__ == "__main__":
    run()
