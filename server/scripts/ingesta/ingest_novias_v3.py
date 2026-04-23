import sys
import os
import re
import shutil
from sqlmodel import Session, select
sys.path.append(os.path.abspath('.'))
from app.database import engine
from app.models.catalog import Category, Product, SKU, Attribute, ProductImage, ProductType
from app.core import inventory_core

CATALOG_PATH = os.path.abspath("../client/src/assets/img_catalogo/NOVIAS")
MEDIA_DEST = os.path.abspath("./media/products")

DICT_SIGLAS = {
    "BLAZ": "Blazer", "BLAZE": "Blazer", "BL": "Blanco", "AR": "Azul Rey",
    "SEF": "Sefora", "PR": "Palo Rosa", "PRIS": "Priscila", "MAXI": "Maxi Largo"
}

def split_blocks(text):
    """Divide el archivo en bloques basados en el patrón de Título + PRECIO."""
    # Los bloques suelen estar separados por varias líneas en blanco o un patrón claro
    # Heurística: Un bloque empieza con texto en mayúscula y sigue con PRECIO:
    blocks = []
    current_block = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_block:
                blocks.append("\n".join(current_block))
                current_block = []
            continue
        current_block.append(line)
        
    if current_block:
        blocks.append("\n".join(current_block))
        
    return blocks

def parse_block(block):
    lines = block.split('\n')
    title = lines[0].strip()
    
    # Extraer precios
    tramos = {}
    for line in lines[1:]:
        if '$' in line:
            precio_match = re.search(r'\$\s*(\d{1,3}(?:\.\d{3})*)', line)
            if precio_match:
                precio = int(precio_match.group(1).replace('.', ''))
                parte_tallas = line.split('$')[0].upper()
                tallas = re.findall(r'\b(12|14|XS|S|M|L|XL|2XL|3XL|4XL|5XL|6XL|7XL)\b', parte_tallas)
                if "-" in parte_tallas: # Rango como 12-14
                    rango = re.findall(r'(\d+)\s*-\s*(\d+)', parte_tallas)
                    for r in rango: tallas.extend([r[0], r[1]])
                
                for t in set(tallas):
                    tramos[t] = precio
    return title, tramos

def get_keywords(text):
    text = text.upper().replace("_", " ")
    tokens = re.findall(r'\b\w{3,}\b', text) # Solo palabras de 3+ letras
    # Traducir siglas si es posible
    return set([DICT_SIGLAS.get(t, t) for t in tokens])

def run_ingestion():
    if not os.path.exists(CATALOG_PATH):
        print(f"Error: {CATALOG_PATH} no existe")
        return

    desc_file = os.path.join(CATALOG_PATH, "DESCRIPCION.txt")
    with open(desc_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    blocks = split_blocks(content)
    all_images = [f for f in os.listdir(CATALOG_PATH) if f.lower().endswith(".jpg")]
    
    with Session(engine) as session:
        # Asegurar categoría Novias bajo Vestimenta
        vestima_stmt = select(Category).where(Category.slug == 'vestimenta')
        vestima = session.exec(vestima_stmt).first()
        
        novia_stmt = select(Category).where(Category.slug == 'novias')
        cat = session.exec(novia_stmt).first()
        if not cat:
            cat = Category(name="Novias", slug="novias", parent_id=vestima.id if vestima else None)
            session.add(cat)
            session.commit()
            session.refresh(cat)

        for block in blocks:
            title, tramos = parse_block(block)
            if not tramos: continue # Saltar bloques sin precios
            
            # Limpiar slug de caracteres no validos para archivos (comas, puntos, etc)
            clean_title = re.sub(r'[^\w\s-]', '', title).strip()
            slug = clean_title.lower().replace(" ", "-")[:80]
            
            # Evitar duplicados (slug único)
            existing = session.exec(select(Product).where(Product.slug == slug)).first()
            if existing: continue
            
            print(f"Ingestando: {title}")
            
            is_composite = "BLAZER" in title.upper() or "KIMONO" in title.upper() or "TAPADO" in title.upper()
            
            product = Product(
                name=title,
                slug=slug,
                description=block,
                category_id=cat.id,
                extras={
                    "is_composite": is_composite,
                    "components": [k for k in ["JUMPER", "BLAZER", "KIMONO", "TAPADO"] if k in title.upper()]
                }
            )
            session.add(product)
            session.commit()
            session.refresh(product)
            
            # Mapeo de fotos
            prod_keywords = get_keywords(title)
            best_images = []
            for img in all_images:
                img_keywords = get_keywords(img)
                # Intersección de palabras clave
                matches = prod_keywords.intersection(img_keywords)
                if matches:
                    score = len(matches)
                    best_images.append((img, score))
            
            # Ordenar por puntuación y seleccionar las mejores
            best_images.sort(key=lambda x: x[1], reverse=True)
            if best_images:
                top_score = best_images[0][1]
                # Tomamos todas las que tengan el top score o sean variantes (_2, _3)
                winners = [img for img, score in best_images if score >= top_score - 1]
                
                for i, img_name in enumerate(winners[:5]): # Max 5 fotos
                    src = os.path.join(CATALOG_PATH, img_name)
                    dest_name = f"{slug}_{i}.jpg"
                    dest_path = os.path.join(MEDIA_DEST, dest_name)
                    if not os.path.exists(MEDIA_DEST): os.makedirs(MEDIA_DEST)
                    
                    try:
                        shutil.copy2(src, dest_path)
                    except Exception as e:
                        print(f"      Error copiando {src} -> {dest_path}: {e}")
                        continue
                    
                    img_rec = ProductImage(
                        product_id=product.id,
                        url=f"/media/products/{dest_name}",
                        is_main=(i == 0)
                    )
                    session.add(img_rec)

            # Generar SKUs
            for talla, precio in tramos.items():
                variant_config = {"Talla": talla, "Color": "Blanco" if "BLANCO" in title.upper() else "Varios"}
                sku_code = inventory_core.generate_sku_id(cat.name, title[:30], variant_config)
                
                # Verificar si el SKU ya existe
                existing_sku = session.exec(select(SKU).where(SKU.sku == sku_code)).first()
                if existing_sku:
                    print(f"      - SKU {sku_code} ya existe, omitiendo.")
                    continue

                # Evitar choque de SKUs
                # barcode_val
                barcode_val = sku_code
                inventory_core.create_barcode_image(barcode_val, sku_code)
                
                sku = SKU(
                    product_id=product.id,
                    sku=sku_code,
                    barcode=barcode_val,
                    price=precio,
                    stock=10,
                    config=variant_config
                )
                session.add(sku)
            session.commit()

    print("Ingesta inteligente de NOVIAS finalizada.")

if __name__ == "__main__":
    run_ingestion()
