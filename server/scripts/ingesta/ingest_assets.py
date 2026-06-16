import os
import re
import shutil
import sys
from sqlmodel import Session, create_engine, select

# CONFIGURACIÓN DE RUTAS ESCALABLE
# Estamos en server/scripts/ingesta/ingest_assets.py
# Subimos 3 niveles para llegar a la raíz del proyecto
SCRIPTS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER_DIR = os.path.dirname(SCRIPTS_DIR)
ROOT_DIR = os.path.dirname(SERVER_DIR)

# Añadir server al path para importar la app
sys.path.append(SERVER_DIR)

from app.database import engine
from app.models.catalog import Category, Product, Attribute, ProductOption, SKU, ProductImage, ProductType

# Rutas de recursos
ASSETS_DIR = os.path.join(ROOT_DIR, "client", "src", "assets", "img_catalogo")
MEDIA_DIR = os.path.join(SERVER_DIR, "media")

# Asegurar que media existe
os.makedirs(MEDIA_DIR, exist_ok=True)

def clean_name(name: str):
    return name.replace("_", " ").title()

def parse_description(content: str):
    """Extrae reglas de precio y especificaciones del TXT"""
    specs = {}
    pricing_rules = []
    
    for line in content.split("\n"):
        if "🔥" in line:
            parts = line.replace("🔥", "").split(" ", 1)
            if len(parts) == 2:
                specs[parts[0].strip()] = parts[1].strip()
            else:
                specs[f"Detalle_{len(specs)}"] = parts[0].strip()
        
        price_match = re.search(r"Tallas?\s+([\w\sа-я\-\\]+)\s+\$([\d\.]+)", line, re.IGNORECASE)
        if price_match:
            tallas_raw = price_match.group(1).strip()
            precio_raw = price_match.group(2).replace(".", "")
            pricing_rules.append({
                "tallas": [t.strip() for t in tallas_raw.replace("-", " ").split()],
                "precio": int(precio_raw)
            })
            
    return specs, pricing_rules

def ingest():
    stats = {"categories": 0, "products": 0, "skus": 0, "updated": 0}
    
    if not os.path.exists(ASSETS_DIR):
        print(f"ERROR: No se encontró la carpeta de assets en: {ASSETS_DIR}")
        return

    with Session(engine) as session:
        # Atributos base
        for attr_name in ["Talla", "Color"]:
            existing = session.exec(select(Attribute).where(Attribute.name == attr_name)).first()
            if not existing:
                session.add(Attribute(name=attr_name))
        session.commit()
        
        for folder_name in os.listdir(ASSETS_DIR):
            folder_path = os.path.join(ASSETS_DIR, folder_name)
            if not os.path.isdir(folder_path): continue
            
            print(f"Analizando: {folder_name}...")
            
            # 1. UPSERT Categoría
            cat_slug = folder_name.lower()
            category = session.exec(select(Category).where(Category.slug == cat_slug)).first()
            if not category:
                category = Category(name=clean_name(folder_name), slug=cat_slug)
                session.add(category)
                session.flush()
                stats["categories"] += 1

            # 2. Leer Descripción
            desc_path = os.path.join(folder_path, "DESCRIPCION.txt")
            specs, pricing_rules = {}, []
            if os.path.exists(desc_path):
                with open(desc_path, "r", encoding="utf-8") as f:
                    specs, pricing_rules = parse_description(f.read())

            # 3. UPSERT Producto
            product = session.exec(select(Product).where(Product.slug == cat_slug)).first()
            is_new_product = False
            if not product:
                product = Product(
                    name=clean_name(folder_name),
                    slug=cat_slug,
                    description=f"Colección {clean_name(folder_name)} por Vistiendomé Chile.",
                    category_id=category.id,
                    type=ProductType.PRENDA,
                    specs=specs
                )
                session.add(product)
                session.flush()
                stats["products"] += 1
                is_new_product = True
            else:
                # Actualizar specs si el producto ya existe
                product.specs = specs
                session.add(product)
                stats["updated"] += 1

            # 4. Procesar Imágenes (Idempotente)
            colores_detectados = set()
            for img_name in os.listdir(folder_path):
                if not img_name.lower().endswith(('.jpg', '.jpeg', '.png')): continue
                
                color_match = re.search(r"([A-Z_]+)(?:_\d+)?\.", img_name)
                if color_match:
                    color_val = clean_name(color_match.group(1))
                    colores_detectados.add(color_val)
                    
                    new_img_name = f"{cat_slug}_{img_name.lower()}"
                    dest_path = os.path.join(MEDIA_DIR, new_img_name)
                    
                    if not os.path.exists(dest_path):
                        shutil.copy(os.path.join(folder_path, img_name), dest_path)
                    
                    # Evitar duplicar registro de imagen
                    img_exists = session.exec(select(ProductImage).where(
                        ProductImage.product_id == product.id, 
                        ProductImage.url == f"/media/{new_img_name}"
                    )).first()
                    
                    if not img_exists:
                        img_rec = ProductImage(
                            product_id=product.id,
                            color_name=color_val,
                            url=f"/media/{new_img_name}",
                            is_main="_2" not in img_name
                        )
                        session.add(img_rec)

            # 5. Generar SKUs (Sin duplicados)
            tallas_todas = ["12", "14", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL"]
            for color in colores_detectados:
                for talla in tallas_todas:
                    precio = 18990
                    for rule in pricing_rules:
                        if talla in rule["tallas"]:
                            precio = rule["precio"]; break
                    
                    sku_code = f"{folder_name[:2].upper()}-{color[:3].upper()}-{talla}".replace(" ", "")
                    # Verificar si el SKU ya existe
                    sku_exists = session.exec(select(SKU).where(SKU.sku == sku_code)).first()
                    if not sku_exists:
                        sku_rec = SKU(
                            product_id=product.id,
                            sku=sku_code,
                            config={"talla": talla, "color": color},
                            price=precio,
                            stock=10
                        )
                        session.add(sku_rec)
                        stats["skus"] += 1

        session.commit()
        print("\n--- REPORTE DE INGESTA ---")
        print(f"Categorías nuevas: {stats['categories']}")
        print(f"Productos nuevos: {stats['products']}")
        print(f"Productos actualizados: {stats['updated']}")
        print(f"Nuevos SKUs generados: {stats['skus']}")
        print("--------------------------\n")
        print("¡Proceso finalizado con éxito!")

if __name__ == "__main__":
    ingest()
