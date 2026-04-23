from app.database import engine
from sqlalchemy import text
import json

with engine.connect() as conn:
    # Ver todos los productos con specs no vacíos
    print("--- PRODUCTOS CON SPECS ---")
    p_specs = conn.execute(text("SELECT id, name, specs FROM product")).mappings().all()
    for p in p_specs:
        if p['specs'] and p['specs'] != '{}' and p['specs'] != {}:
            print(f"ID: {p['id']}, Name: {p['name']}, Specs: {p['specs']}")
    
    # Ver si Vestido Priscila tiene algo
    print("\n--- DETALLE VESTIDO PRISCILA ---")
    priscila = conn.execute(text("SELECT id, name, specs FROM product WHERE name ILIKE '%Priscila%'")).mappings().first()
    if priscila:
        pid = priscila['id']
        print(f"ID: {pid}, Name: {priscila['name']}, Specs: {priscila['specs']}")
        skus = conn.execute(text(f"SELECT id, sku, config, price FROM sku WHERE product_id={pid}")).mappings().all()
        print(f"SKUs: {[dict(s) for s in skus]}")
        
        # Ver si hay movimientos de stock
        for s in skus:
            stock = conn.execute(text(f"SELECT SUM(quantity) FROM stockmovement WHERE sku_id={s['id']}")).scalar()
            print(f"  SKU {s['sku']} Stock: {stock}")
    else:
        print("Vestido Priscila no encontrado.")

    # Ver si hay algún SKU con config en TODA la base de datos
    print("\n--- SKUS CON CONFIG ---")
    all_skus = conn.execute(text("SELECT id, product_id, sku, config FROM sku")).mappings().all()
    count = 0
    for s in all_skus:
        if s['config'] and s['config'] != '{}' and s['config'] != {}:
            print(f"ID: {s['id']}, PID: {s['product_id']}, SKU: {s['sku']}, Config: {s['config']}")
            count += 1
    print(f"Total SKUs con config: {count}")
