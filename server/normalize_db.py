import string
from sqlmodel import Session, select, func
from app.database import engine
from app.models.catalog import Characteristic, SKU, Product, SpecificationCharacteristicLink, ProductImage
from app.core import inventory_core

def normalize_char(text: str) -> str:
    if not text: return ""
    return text.strip().upper()

def normalize_opt(text: str) -> str:
    if not text: return ""
    return string.capwords(text.strip().lower())

def run_normalization():
    print("Iniciando normalizacion profunda de la base de datos...")
    
    with Session(engine) as db:
        try:
            # 1. Normalizar Características (Atributos Globales)
            attributes = db.exec(select(Characteristic)).all()
            print(f"Procesando {len(attributes)} grupos de caracteristicas...")
            for attr in attributes:
                attr.name = normalize_char(attr.name)
                if attr.domain:
                    new_domain = []
                    for item in attr.domain:
                        new_item = {**item}
                        if "value" in new_item:
                            new_item["value"] = normalize_opt(new_item["value"])
                        new_domain.append(new_item)
                    attr.domain = new_domain
                db.add(attr)
            db.commit()

            # 2. Normalizar Vínculos de Especificaciones
            links = db.exec(select(SpecificationCharacteristicLink)).all()
            print(f"Procesando {len(links)} vinculos de especificaciones...")
            for link in links:
                if link.allowed_values:
                    link.allowed_values = [normalize_opt(v) for v in link.allowed_values]
                    db.add(link)
            db.commit()

            # 3. Normalizar SKUs (Variantes)
            # Esto es lo más crítico: Llaves en UPPER, Valores en Title Case
            skus = db.exec(select(SKU)).all()
            print(f"Procesando {len(skus)} variantes (SKUs)...")
            for sku in skus:
                if sku.config:
                    new_config = {normalize_char(k): normalize_opt(v) for k, v in sku.config.items()}
                    
                    # Regenerar SKU ID si queremos coherencia total
                    product = sku.product
                    if product and product.category:
                        new_sku_code = inventory_core.generate_sku_id(
                            product.category.name, 
                            product.name, 
                            new_config
                        )
                        sku.sku = new_sku_code
                    
                    sku.config = new_config
                    db.add(sku)
            db.commit()

            # 4. Normalizar Imágenes (config_match)
            images = db.exec(select(ProductImage)).all()
            print(f"Procesando {len(images)} metadatos de imagenes...")
            for img in images:
                if img.ui_config and "config_match" in img.ui_config:
                    cm = img.ui_config["config_match"]
                    if isinstance(cm, dict):
                        img.ui_config["config_match"] = {normalize_char(k): normalize_opt(v) for k, v in cm.items()}
                        db.add(img)
            db.commit()

            print("Finalizado: Normalizacion completada con exito!")

        except Exception as e:
            print(f"Error durante la normalizacion: {e}")
            db.rollback()

if __name__ == "__main__":
    run_normalization()
