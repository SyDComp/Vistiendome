from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from ...database import get_session
from ...models.catalog import Collection, SKU, Product
from ...core.looks import asset_de_variante
from ...core.pricing import compute_effective_price, get_chile_time
from ...core.imagenes import srcset_de, srcset_desde_url

router = APIRouter()

@router.get("/")
def list_public_collections(db: Session = Depends(get_session)):
    """Lista todas las colecciones activas para el público."""
    statement = select(Collection).where(Collection.is_active == True).order_by(Collection.created_at.desc())
    colecciones = db.exec(statement).all()
    # La portada se guarda como texto, no como MediaAsset, así que las derivadas
    # se resuelven desde la URL. Sin esto la portada del sitio bajaba estas
    # fotos completas (~450 KB cada una) para mostrarlas del tamaño de una tarjeta.
    salida = []
    for c in colecciones:
        d = c.dict()
        d["image_srcset"] = srcset_desde_url(c.image_url)
        salida.append(d)
    return salida

@router.get("/{slug}")
def get_public_collection(slug: str, db: Session = Depends(get_session)):
    """Obtiene el detalle de una colección por su slug, incluyendo sus SKUs."""
    statement = select(Collection).where(Collection.slug == slug, Collection.is_active == True).options(
        selectinload(Collection.skus).selectinload(SKU.media_assets),
        selectinload(Collection.skus).selectinload(SKU.product)
    )
    collection = db.exec(statement).first()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")
    
    # Enriquecer SKUs para el frontend público
    res = collection.dict()
    skus_data = []
    # El precio que se muestra es el VIGENTE, no el de la ficha del SKU.
    #
    # `sku.dict()` devuelve el modelo crudo: trae `price` (el precio base) y los
    # campos de la oferta sin resolver (sale_type, sale_start, sale_end), pero
    # NO trae `on_sale` ni `original_price`, que son calculados. Asi que esta
    # pantalla mostraba el precio SIN la oferta aplicada y no tenia con que
    # dibujar la etiqueta: un producto rebajado se veia a precio normal.
    #
    # Se usa el mismo compute_effective_price que el catalogo, para que las dos
    # pantallas no puedan discrepar sobre cuanto vale una prenda.
    now = get_chile_time()
    for sku in collection.skus:
        sku_dict = sku.dict()
        precio_vigente, en_oferta, _ = compute_effective_price(sku, sku.product, now)
        sku_dict["price"] = precio_vigente
        sku_dict["original_price"] = sku.price or 0.0
        sku_dict["on_sale"] = en_oferta
        sku_dict["product_name"] = sku.product.name
        sku_dict["name"] = sku.product.name
        sku_dict["product_slug"] = sku.product.slug
        sku_dict["slug"] = sku.product.slug
        # Determinista y con sus derivadas: el mismo criterio que usa el
        # catálogo, para que la portada no baje los originales completos.
        asset = asset_de_variante(sku)
        sku_dict["image"] = asset.url if asset else None
        sku_dict["image_srcset"] = srcset_de(asset) if asset else ""
        skus_data.append(sku_dict)
    
    res["skus"] = skus_data
    return res
