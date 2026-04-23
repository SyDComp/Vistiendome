import sys
import os
import re
import shutil
from sqlalchemy import create_engine
from sqlmodel import Session, SQLModel, select

sys.path.append(os.path.abspath('.'))
from app.database import engine
from app.models.catalog import Category, Product, SKU, Attribute, ProductImage, ProductType
from app.core import inventory_core

CATALOG_PATH = os.path.abspath("../client/src/assets/img_catalogo")
MEDIA_DEST = os.path.abspath("./media/products")

# Diccionario de Vistiendome
DICT_SIGLAS = {
    "BLAZ": "Blazer",
    "BLAZE": "Blazer",
    "BL": "Blanco",
    "AR": "Azul Rey",
    "SEF": "Sefora",
    "PR": "Palo Rosa",
    "PRIS": "Priscila",
    "MAXI": "Maxi Largo",
    "INV": "Invierno",
    "MAG": "Magdalena"
}

def normalize_name(name: str) -> str:
    """Intenta convertir un string_con_guiones_o_mayusculas en un Título Legible."""
    name = name.replace(".jpg", "").replace("_", " ")
    words = name.split()
    # Traducir usando el diccionario si es posible
    translated = [DICT_SIGLAS.get(w.upper(), w.capitalize()) for w in words]
    return " ".join(translated)

def parse_tramos_precio(texto: str) -> dict:
    """
    Busca patrones de precio en el texto.
    Retorna un dict { "talla": precio(int) }
    Ej: "Tallas 12 y 14 $ 12.990" -> {"12": 12990, "14": 12990}
    """
    tramos = {}
    
    # Patrón para cosas del tipo: Talla XX - YY $ Precio
    lineas = texto.split('\\n')
    for linea in lineas:
        if '$' in linea:
            # Buscar precio (quitando puntos)
            precio_match = re.search(r'\$\s*(\d{1,3}(?:\.\d{3})*)', linea)
            if not precio_match:
                continue
            precio = int(precio_match.group(1).replace('.', ''))
            
            # Buscar tallas (palabras clave o números antes del $)
            parte_tallas = linea.split('$')[0].upper()
            tallas_encontradas = re.findall(r'\b(12|14|XS|S|M|L|XL|2XL|3XL|4XL|5XL|6XL|7XL)\b', parte_tallas)
            
            for t in tallas_encontradas:
                tramos[t] = precio
                
    return tramos

def process_folder(folder_path: str, category_name: str, session: Session):
    # 1. Crear Categoría
    cat_slug = category_name.lower().replace(" ", "-")
    statement = select(Category).where(Category.slug == cat_slug)
    result = session.exec(statement).first()
    
    if result:
        cat = result
    else:
        cat = Category(name=normalize_name(category_name), slug=cat_slug)
        session.add(cat)
        session.commit()
    
    print(f"Procesando Categoria: {cat.name}")

    desc_path = os.path.join(folder_path, "DESCRIPCION.txt")
    tramos: dict = {}
    if os.path.exists(desc_path):
        with open(desc_path, 'r', encoding='utf-8', errors='ignore') as f:
            tramos = parse_tramos_precio(f.read())
            
    if not tramos: # Precios por defecto si falla el parser
        tramos = {"S": 15000, "M": 15000, "L": 15000}

    # Leer imágenes (cada imagen principal = un producto base o variante importante)
    for filename in os.listdir(folder_path):
        if not filename.lower().endswith(".jpg") or "_2" in filename or "_3" in filename:
            continue
            
        prod_name_raw = filename.replace(".jpg", "")
        product_name = normalize_name(prod_name_raw)

        # Si estamos en la carpeta de NOVIAS, el producto se llama diferente (ej: Jumper Blazer)
        if category_name == "NOVIAS":
            base_name = product_name
        else:
            # Si es Vestido Noemi, el archivo solo tiene el color (ej: AZUL_MARINO.jpg)
            base_name = f"{normalize_name(category_name)} {product_name}"
            
        slug = base_name.lower().replace(" ", "-")
        product = session.exec(select(Product).where(Product.slug == slug)).first()
        if not product:
            product = Product(
                name=base_name,
                slug=slug,
                description=f"Importado automaticamente de {filename}",
                category_id=cat.id,
                extras={"origen": "ingesta_v2", "raw_filename": filename}
            )
            session.add(product)
            session.commit()
            
            print(f"   Creado Producto: {product.name}")

            # Copiar imagen y crear registro
            src_img = os.path.join(folder_path, filename)
            dest_img_name = f"{slug}.jpg"
            dest_img_path = os.path.join(MEDIA_DEST, dest_img_name)
            if not os.path.exists(MEDIA_DEST): os.makedirs(MEDIA_DEST)
            shutil.copy2(src_img, dest_img_path)
            
            img_record = ProductImage(product_id=product.id, url=f"/media/products/{dest_img_name}", is_main=True)
            session.add(img_record)

            # Generar SKUs para todas las tallas encontradas
            for talla, precio in tramos.items():
                variant_config = {"Talla": talla, "Color": product_name if category_name != "NOVIAS" else "Blanco"}
                sku_code = inventory_core.generate_sku_id(cat.name, base_name, variant_config)
                
                # Verificar si el SKU ya existe
                existing_sku = session.exec(select(SKU).where(SKU.sku == sku_code)).first()
                if existing_sku:
                    print(f"      - SKU {sku_code} ya existe, omitiendo.")
                    continue

                # barcode_val
                barcode_val = sku_code
                inventory_core.create_barcode_image(barcode_val, sku_code)
                
                sku = SKU(
                    product_id=product.id, 
                    sku=sku_code, 
                    barcode=barcode_val,
                    price=precio, 
                    stock=10, # default
                    config=variant_config
                )
                session.add(sku)
            session.commit()

def run_ingestion():
    with Session(engine) as session:
        for folder in os.listdir(CATALOG_PATH):
            full_path = os.path.join(CATALOG_PATH, folder)
            if os.path.isdir(full_path):
                process_folder(full_path, folder, session)
        print("\nIngesta masiva finalizada!")

if __name__ == "__main__":
    run_ingestion()
