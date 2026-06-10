from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from ...database import get_session
from ...models.catalog import Collection, SKU, Product

router = APIRouter()

@router.get("/")
def list_public_collections(db: Session = Depends(get_session)):
    """Lista todas las colecciones activas para el público."""
    statement = select(Collection).where(Collection.is_active == True).order_by(Collection.created_at.desc())
    return db.exec(statement).all()

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
        sku_dict["image"] = next((img.url for img in sku.media_assets), None)
        skus_data.append(sku_dict)
    
    res["skus"] = skus_data
    return res
