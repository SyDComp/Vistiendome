import os
import uuid
import shutil
from typing import List, Dict
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from ...database import get_session
from sqlmodel import Session

from sqlmodel import select
from ...models.catalog import Product, SKU, ProductImage

router = APIRouter()

# Directorio de almacenamiento (relativo a la raíz del servidor)
UPLOAD_DIR = "media"

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
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

    # 3. Guardar en disco
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando el archivo: {str(e)}")

    # 4. Retornar URL relativa
    return {
        "url": f"/media/{unique_filename}",
        "filename": unique_filename,
        "original_name": file.filename
    }

@router.get("/")
def list_media():
    """Lista todos los archivos subidos (fines de galería básica)"""
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
        
    files = []
    for f in os.listdir(UPLOAD_DIR):
        if os.path.isfile(os.path.join(UPLOAD_DIR, f)):
            files.append({
                "url": f"/media/{f}",
                "filename": f
            })
    return sorted(files, key=lambda x: x['filename'])

@router.delete("/batch")
async def delete_media_batch(urls: List[str], db: Session = Depends(get_session)):
    """
    Elimina archivos físicos y limpia referencias en la base de datos.
    """
    deleted_count = 0
    errors = []

    for url in urls:
        filename = url.replace("/media/", "")
        file_path = os.path.join(UPLOAD_DIR, filename)

        try:
            # 1. Limpiar Referencias en DB (Integridad Referencial)
            # SKU.image_urls
            skus = db.exec(select(SKU).where(SKU.image_urls.contains(url))).all()
            for sku in skus:
                new_urls = [u for u in sku.image_urls if u != url]
                sku.image_urls = new_urls
                db.add(sku)

            # ProductImage (Borrar registro completo)
            product_images = db.exec(select(ProductImage).where(ProductImage.url == url)).all()
            for pi in product_images:
                db.delete(pi)

            db.commit()

            # 2. Eliminar archivo físico
            if os.path.exists(file_path):
                os.remove(file_path)
                deleted_count += 1
            else:
                errors.append(f"Archivo no encontrado: {filename}")

        except Exception as e:
            db.rollback()
            errors.append(f"Error procesando {filename}: {str(e)}")

    return {
        "success": deleted_count,
        "errors": errors
    }

@router.post("/rename")
async def rename_media_batch(mapping: Dict[str, str], db: Session = Depends(get_session)):
    """
    Renombra archivos físicos y actualiza referencias en la base de datos.
    Mapping: { "old_url": "new_url" }
    """
    renamed_count = 0
    errors = []

    for old_url, new_url in mapping.items():
        old_filename = old_url.replace("/media/", "")
        new_filename = new_url.replace("/media/", "")
        
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        new_path = os.path.join(UPLOAD_DIR, new_filename)

        if not os.path.exists(old_path):
            errors.append(f"No existe el origen: {old_filename}")
            continue

        try:
            # 1. Renombrar archivo físico
            os.rename(old_path, new_path)

            # 2. Actualizar Referencias en DB
            # SKU.image_urls
            # Nota: SQLModel/SQLAlchemy JSON types requieren re-asignación para detectar cambios
            skus = db.exec(select(SKU).where(SKU.image_urls.contains(old_url))).all()
            for sku in skus:
                updated_urls = [u.replace(old_url, new_url) for u in sku.image_urls]
                sku.image_urls = updated_urls
                db.add(sku)

            # ProductImage
            product_images = db.exec(select(ProductImage).where(ProductImage.url == old_url)).all()
            for pi in product_images:
                pi.url = new_url
                db.add(pi)

            db.commit()
            renamed_count += 1

        except Exception as e:
            db.rollback()
            errors.append(f"Error renombrando {old_filename}: {str(e)}")

    return {
        "success": renamed_count,
        "errors": errors
    }
