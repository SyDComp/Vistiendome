import os
from sqlalchemy import create_engine, text
import json
from dotenv import load_dotenv

# Cargar variables de entorno (por si se corre directo)
load_dotenv()

# Tomar la URL de la base de datos de las variables de entorno, con un fallback a local
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres")
engine = create_engine(DATABASE_URL)

def run():
    print(f"Conectando a BD: {DATABASE_URL}")
    print("--- FIXING SKUs ---")
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, config FROM sku WHERE config::text ILIKE '%TALLAS%'")).fetchall()
        
        updated_count = 0
        for r in res:
            config = dict(r[1]) if r[1] else {}
            if "TALLAS" in config:
                config["TALLA"] = config.pop("TALLAS")
                conn.execute(text("UPDATE sku SET config = :config WHERE id = :id"), {"config": json.dumps(config), "id": r[0]})
                updated_count += 1
            elif "tallas" in config:
                config["TALLA"] = config.pop("tallas")
                conn.execute(text("UPDATE sku SET config = :config WHERE id = :id"), {"config": json.dumps(config), "id": r[0]})
                updated_count += 1
            elif "Tallas" in config:
                config["TALLA"] = config.pop("Tallas")
                conn.execute(text("UPDATE sku SET config = :config WHERE id = :id"), {"config": json.dumps(config), "id": r[0]})
                updated_count += 1
        conn.commit()
        print(f"Updated {updated_count} SKUs.")
        
    print("--- FIXING PRODUCT EXTRAS/SPECS ---")
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, extras, specs FROM product WHERE extras::text ILIKE '%TALLAS%' OR specs::text ILIKE '%TALLAS%'")).fetchall()
        updated_count = 0
        for r in res:
            extras = dict(r[1]) if r[1] else {}
            specs = dict(r[2]) if r[2] else {}
            changed = False
            
            if "TALLAS" in extras:
                extras["TALLA"] = extras.pop("TALLAS")
                changed = True
            if "TALLAS" in specs:
                specs["TALLA"] = specs.pop("TALLAS")
                changed = True
                
            if changed:
                conn.execute(text("UPDATE product SET extras = :extras, specs = :specs WHERE id = :id"), {"extras": json.dumps(extras), "specs": json.dumps(specs), "id": r[0]})
                updated_count += 1
        conn.commit()
        print(f"Updated {updated_count} Products.")

if __name__ == "__main__":
    run()
