from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from ...database import get_session
from ...models.catalog import Collection, SKU, Product
from ...core.looks import asset_de_variante
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
    for sku in collection.skus:
        sku_dict = sku.dict()
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
