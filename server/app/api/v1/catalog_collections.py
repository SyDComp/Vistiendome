from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, delete
from ...database import get_session
from ...models.catalog import Collection, SKU, CollectionSKULink, Product
from pydantic import BaseModel
from datetime import datetime
import re
import unicodedata
from ...core.sockets import manager

router = APIRouter()

class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    sku_ids: List[int] = []

def slugify(text: str) -> str:
    """Convierte texto a un slug amigable para URL usando _ para espacios."""
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '_', text).strip('_')
    return text

@router.get("/collections")
def list_collections(db: Session = Depends(get_session)):
    return db.exec(select(Collection)).all()

from sqlalchemy.orm import selectinload

@router.get("/collections/{id}")
def get_collection(id: int, db: Session = Depends(get_session)):
    # Usar selectinload para traer SKUs y sus media_assets/product en una sola ráfaga
    statement = select(Collection).where(Collection.id == id).options(
        selectinload(Collection.skus).selectinload(SKU.media_assets),
        selectinload(Collection.skus).selectinload(SKU.product)
    )
    collection = db.exec(statement).first()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Enriquecer con datos de productos para el frontend
    result = collection.dict()
    skus_data = []
    for sku in collection.skus:
        sku_dict = sku.dict()
        sku_dict["product_name"] = sku.product.name
        sku_dict["name"] = sku.product.name  # Alias for frontend consistency
        sku_dict["slug"] = sku.product.slug
        # Incluir imágenes para que se vea bien en la tabla/lista
        main_img = next((img.url for img in sku.media_assets), None)
        sku_dict["image"] = main_img
        skus_data.append(sku_dict)
    
    result["skus"] = skus_data
    return result

@router.post("/collections")
async def create_collection(data: CollectionCreate, db: Session = Depends(get_session)):
    slug = slugify(data.name)
    
    # Verificar si el slug ya existe
    existing = db.exec(select(Collection).where(Collection.slug == slug)).first()
    if existing:
        slug = f"{slug}_{int(datetime.utcnow().timestamp())}"

    collection = Collection(
        name=data.name,
        slug=slug,
        description=data.description,
        image_url=data.image_url,
        is_active=data.is_active
    )
    db.add(collection)
    db.commit()
    db.refresh(collection)
    
    if data.sku_ids:
        for sid in data.sku_ids:
            link = CollectionSKULink(collection_id=collection.id, sku_id=sid)
            db.add(link)
        db.commit()
        db.refresh(collection)
    
    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "collections",
        "action": "create",
        "slug": collection.slug
    })
        
    return collection

@router.put("/collections/{id}")
async def update_collection(id: int, data: CollectionCreate, db: Session = Depends(get_session)):
    collection = db.get(Collection, id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    old_slug = collection.slug
    collection.name = data.name
    collection.description = data.description
    collection.image_url = data.image_url
    collection.is_active = data.is_active
    
    # Actualizar SKUs (Borrar antiguos y poner nuevos)
    db.exec(delete(CollectionSKULink).where(CollectionSKULink.collection_id == id))
    for sid in data.sku_ids:
        link = CollectionSKULink(collection_id=id, sku_id=sid)
        db.add(link)
    
    db.commit()
    db.refresh(collection)

    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "collections",
        "action": "update",
        "slug": collection.slug,
        "old_slug": old_slug
    })

    return collection

@router.delete("/collections/{id}")
async def delete_collection(id: int, db: Session = Depends(get_session)):
    collection = db.get(Collection, id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    slug_to_invalidate = collection.slug
    db.delete(collection)
    db.commit()

    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "collections",
        "action": "delete",
        "slug": slug_to_invalidate
    })

    return {"ok": True}
