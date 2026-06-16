import os
import uuid
import shutil
from typing import List, Dict
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from ...database import get_session
from sqlmodel import Session

from sqlmodel import select, delete
from ...models.catalog import Product, SKU, MediaAsset, ProductMediaLink, SKUMediaLink
from ...models.cms import HomepageSection

router = APIRouter()

# Directorio de almacenamiento (relativo a la raíz del servidor)
UPLOAD_DIR = "media"

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_session)):
    """
    Sube un archivo imagen al servidor local.
    Genera un nombre único para evitar colisiones.
    """
    # 1. Validar extensión
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["jpg", "jpeg", "png", "webp", "gif"]:
        raise HTTPException(status_code=400, detail="Formato de imagen no permitido")

    # 2. Generar nombre único
    unique_filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Inserción Relacional en la Base de Datos
        asset = MediaAsset(
            filename=unique_filename,
            original_name=file.filename,
            url=f"/media/{unique_filename}",
            mime_type=file.content_type,
            file_size=os.path.getsize(file_path)
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando el archivo: {str(e)}")

    return {
        "id": asset.id,
        "url": asset.url,
        "filename": asset.filename,
        "original_name": asset.original_name
    }

@router.get("/")
def list_media(db: Session = Depends(get_session)):
    """Lista todos los archivos de medios (Directo desde la BD)"""
    assets = db.exec(select(MediaAsset)).all()
    return [{
        "id": a.id, 
        "url": a.url, 
        "filename": a.filename,
        "original_name": a.original_name
    } for a in assets]

@router.post("/check-references")
def check_media_references(ids: List[int], db: Session = Depends(get_session)):
    """
    Verifica si una lista de IDs de MediaAsset está en uso en productos, SKUs (variantes) o el CMS.
    """
    results = []
    has_references = False

    for asset_id in ids:
        asset = db.get(MediaAsset, asset_id)
        if not asset:
            continue

        associations = []

        # 1. Comprobar asociaciones con Productos
        links = db.exec(
            select(ProductMediaLink, Product)
            .join(Product, Product.id == ProductMediaLink.product_id)
            .where(ProductMediaLink.media_asset_id == asset_id)
        ).all()
        for link, product in links:
            associations.append({
                "type": "product",
                "name": f"Producto: {product.name}",
                "id": product.id
            })

        # 2. Comprobar asociaciones con SKUs (Variantes)
        sku_links = db.exec(
            select(SKUMediaLink, SKU, Product)
            .join(SKU, SKU.id == SKUMediaLink.sku_id)
            .join(Product, Product.id == SKU.product_id)
            .where(SKUMediaLink.media_asset_id == asset_id)
        ).all()
        for link, sku, product in sku_links:
            associations.append({
                "type": "sku",
                "name": f"Variante: {product.name} ({sku.sku})",
                "id": sku.id
            })

        # 3. Comprobar asociaciones con Secciones del CMS (Homepage)
        sections = db.exec(select(HomepageSection)).all()
        for sec in sections:
            config_str = str(sec.config).lower()
            if asset.filename.lower() in config_str or asset.url.lower() in config_str:
                associations.append({
                    "type": "homepage",
                    "name": f"CMS Homepage - Sección: {sec.title} ({sec.type})",
                    "id": sec.id
                })

        if len(associations) > 0:
            has_references = True
            results.append({
                "media_id": asset_id,
                "filename": asset.filename,
                "original_name": asset.original_name,
                "associations": associations
            })

    return {
        "has_references": has_references,
        "references": results
    }

@router.delete("/batch")
async def delete_media_batch(ids: List[int], db: Session = Depends(get_session)):
    """
    Elimina archivos físicos y limpia referencias en la base de datos a través de IDs.
    """
    deleted_count = 0
    errors = []

    for asset_id in ids:
        asset = db.get(MediaAsset, asset_id)
        if not asset:
            errors.append(f"MediaAsset no encontrado: ID {asset_id}")
            continue

        file_path = os.path.join(UPLOAD_DIR, asset.filename)

        try:
            # 1. Limpiar Referencias en DB (Integridad Referencial Estricta)
            db.exec(delete(SKUMediaLink).where(SKUMediaLink.media_asset_id == asset_id))
            db.exec(delete(ProductMediaLink).where(ProductMediaLink.media_asset_id == asset_id))

            # Borrar la entidad MediaAsset
            db.delete(asset)
            db.commit()

            # 2. Eliminar archivo físico
            if os.path.exists(file_path):
                os.remove(file_path)
                deleted_count += 1
            else:
                errors.append(f"Archivo no encontrado en disco: {asset.filename}")

        except Exception as e:
            db.rollback()
            errors.append(f"Error procesando el asset {asset_id}: {str(e)}")

    return {
        "success": deleted_count,
        "errors": errors
    }

@router.post("/rename")
async def rename_media_batch(mapping: Dict[int, str], db: Session = Depends(get_session)):
    """
    Renombra archivos físicos y actualiza el MediaAsset.
    Mapping: { asset_id: "new_filename" }
    """
    renamed_count = 0
    errors = []

    for asset_id_str, new_filename in mapping.items():
        asset_id = int(asset_id_str)
        asset = db.get(MediaAsset, asset_id)
        if not asset:
            errors.append(f"No existe el asset: {asset_id}")
            continue

        old_path = os.path.join(UPLOAD_DIR, asset.filename)
        new_path = os.path.join(UPLOAD_DIR, new_filename)

        if not os.path.exists(old_path):
            errors.append(f"No existe el archivo en disco: {asset.filename}")
            continue

        try:
            # 1. Renombrar archivo físico
            os.rename(old_path, new_path)

            # 2. Actualizar MediaAsset (La magia relacional: no hay que tocar SKUs ni Productos)
            asset.filename = new_filename
            asset.url = f"/media/{new_filename}"
            db.add(asset)
            db.commit()
            
            renamed_count += 1

        except Exception as e:
            db.rollback()
            errors.append(f"Error renombrando {asset.filename}: {str(e)}")

    return {
        "success": renamed_count,
        "errors": errors
    }
