from app.database import engine
from sqlalchemy import text
import json

with engine.connect() as conn:
    # 1. Buscar Vestido Priscila
    res = conn.execute(text("SELECT id FROM product WHERE name ILIKE '%Priscila%'")).mappings().first()
    if not res:
        print("Error: Vestido Priscila no encontrado.")
    else:
        pid = res['id']
        print(f"Poblando datos para producto ID: {pid}")

        # 2. Specs
        specs = {
            "Material": "Tela sofía premium",
            "Cuello": "Escote en V",
            "Largo": "Midi (Bajo rodilla)"
        }
        conn.execute(
            text("UPDATE product SET specs = :specs WHERE id = :pid"),
            {"specs": json.dumps(specs), "pid": pid}
        )

        # 3. Borrar SKUs viejos para este producto si hubiera
        conn.execute(text("DELETE FROM stockmovement WHERE sku_id IN (SELECT id FROM sku WHERE product_id = :pid)"), {"pid": pid})
        conn.execute(text("DELETE FROM sku WHERE product_id = :pid"), {"pid": pid})

        # 4. Crear SKUs con config
        skus_to_create = [
            {"sku": "PRIS-BLANCO-XS", "price": 45000, "config": {"color": "Blanco", "talla": "XS"}},
            {"sku": "PRIS-BLANCO-S", "price": 45000, "config": {"color": "Blanco", "talla": "S"}},
            {"sku": "PRIS-BLANCO-M", "price": 48000, "config": {"color": "Blanco", "talla": "M"}},
            {"sku": "PRIS-BLANCO-L", "price": 48000, "config": {"color": "Blanco", "talla": "L"}},
            {"sku": "PRIS-MARFIL-M", "price": 52000, "config": {"color": "Marfil", "talla": "M"}},
        ]

        for s in skus_to_create:
            conn.execute(
                text("INSERT INTO sku (product_id, sku, price, config, stock) VALUES (:pid, :sku, :price, :config, :stock)"),
                {"pid": pid, "sku": s['sku'], "price": s['price'], "config": json.dumps(s['config']), "stock": 5}
            )
            
            # Obtener ID del SKU insertado
            sid = conn.execute(text("SELECT id FROM sku WHERE sku = :sku"), {"sku": s['sku']}).scalar()
            
            # Movimiento de stock
            conn.execute(
                text("INSERT INTO stockmovement (sku_id, type, quantity, note) VALUES (:sid, 'RECEIPT', 5, 'Seed data')"),
                {"sid": sid}
            )

        conn.commit()
        print("Datos de prueba insertados con éxito.")
