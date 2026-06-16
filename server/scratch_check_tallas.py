import os
from sqlalchemy import create_engine, text
import json

DATABASE_URL = "postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres"
engine = create_engine(DATABASE_URL)

def run():
    print("--- SKUs con 'TALLAS' en config ---")
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT id, product_id, sku, config 
            FROM sku 
            WHERE config::text ILIKE '%tallas%'
        """)).fetchall()
        for r in res:
            print(dict(r._mapping))
            
    print("\n--- SKUs con 'TALLA' en config ---")
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT id, product_id, sku, config 
            FROM sku 
            WHERE config::text ILIKE '%talla%' AND config::text NOT ILIKE '%tallas%'
            LIMIT 10
        """)).fetchall()
        for r in res:
            print(dict(r._mapping))

if __name__ == "__main__":
    run()
