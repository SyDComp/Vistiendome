import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.models.catalog import SKU, StockMovement, MovementType
from sqlmodel import SQLModel

DATABASE_URL = 'postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres'
engine = create_engine(DATABASE_URL)

def migrate():
    with Session(engine) as session:
        print("Buscando SKUs con stock para migrar...")
        skus = session.execute(select(SKU)).scalars().all()
        
        migrated_count = 0
        for sku in skus:
            if sku.stock > 0:
                # Crear movimiento inicial por la cantidad actual
                movement = StockMovement(
                    sku_id=sku.id,
                    type=MovementType.RECEIPT,
                    quantity=sku.stock,
                    note="Migración inicial de campo 'stock' a Kardex"
                )
                session.add(movement)
                migrated_count += 1
                print(f"Migrado SKU {sku.sku}: {sku.stock} unidades")
        
        session.commit()
        print(f"Migración completada. Se crearon {migrated_count} registros de movimiento.")

if __name__ == "__main__":
    migrate()
