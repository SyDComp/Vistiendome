import os
import sys
from sqlmodel import Session, create_engine, select, delete

# Añadir el path del servidor para importar los modelos y la base de datos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from models.catalog import Product, SKU, StockMovement, ProductImage

def clean_catalog():
    print("Iniciando limpieza profunda del catalogo...")
    
    with Session(engine) as db:
        try:
            # 1. Borrar movimientos de stock (dependen de SKU)
            print("Borrando movimientos de stock...")
            db.exec(delete(StockMovement))
            
            # 2. Borrar SKUs (dependen de Product)
            print("Borrando versiones (SKUs)...")
            db.exec(delete(SKU))
            
            # 3. Borrar imágenes de productos
            print("Borrando imagenes de productos...")
            db.exec(delete(ProductImage))
            
            # 4. Borrar productos base
            print("Borrando productos...")
            db.exec(delete(Product))
            
            db.commit()
            print("Catalogo limpiado con exito. El sistema esta ahora vacio y listo.")
            
        except Exception as e:
            db.rollback()
            print(f"❌ Error durante la limpieza: {e}")

if __name__ == "__main__":
    clean_catalog()
