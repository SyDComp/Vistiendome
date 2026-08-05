import os
import re
import uuid
import shutil
from typing import List, Dict, Optional
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from ...database import get_session
from sqlmodel import Session

from sqlmodel import select, delete
from ...models.catalog import Product, SKU, MediaAsset, ProductMediaLink, SKUMediaLink
from ...models.cms import HomepageSection
from ...models.settings import SiteSetting
from ...api.deps import RequirePermiso
from ...models.iam import CuentaAcceso

router = APIRouter()

# Directorio de almacenamiento (relativo a la raíz del servidor)
UPLOAD_DIR = "media"


def _auto_alias(original_name: str) -> str:
    """Genera un nombre amigable desde el nombre original: sin extensión,
    separadores -> espacios, Title Case. Ej: 'vestido_noemi_azul.jpg' -> 'Vestido Noemi Azul'."""
    base = os.path.splitext(original_name or "")[0]
    base = re.sub(r"[_\-.]+", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    return base.title() if base else ""


def _display_alias(asset) -> str:
    """Alias a mostrar: el custom si existe; si no, el auto-generado; si no, el filename."""
    if asset.alias and asset.alias.strip():
        return asset.alias.strip()
    return _auto_alias(asset.original_name) or asset.filename


def _json_references_asset(node, asset_id, needles) -> bool:
    """
    Escanea recursivamente un JSON buscando una referencia a un asset, ya sea por
    ID (clave *asset_id == asset_id) o por URL/nombre (string que contiene la url/filename).
    `needles` = set de strings en minúscula (url y filename del asset).
    """
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ("image_asset_id", "asset_id", "media_asset_id") and v == asset_id:
                return True
            if _json_references_asset(v, asset_id, needles):
                return True
        return False
    if isinstance(node, list):
        return any(_json_references_asset(x, asset_id, needles) for x in node)
    if isinstance(node, str):
        low = node.lower()
        return any(n and n in low for n in needles)
    return False

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
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
            alias=_auto_alias(file.filename) or None,
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
        "original_name": asset.original_name,
        "alias": _display_alias(asset)
    }

@router.get("/")
def list_media(db: Session = Depends(get_session)):
    """Lista todos los archivos de medios (Directo desde la BD)"""
    assets = db.exec(select(MediaAsset)).all()
    return [{
        "id": a.id,
        "url": a.url,
        "filename": a.filename,
        "original_name": a.original_name,
        "alias": _display_alias(a)
    } for a in assets]

class AliasUpdate(BaseModel):
    id: int
    alias: Optional[str] = None


@router.post("/alias")
async def update_alias(data: AliasUpdate, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Asigna un nombre amigable (alias) a un asset. Vacío => vuelve al automático."""
    asset = db.get(MediaAsset, data.id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset no encontrado")
    cleaned = (data.alias or "").strip()
    asset.alias = cleaned or None
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return {"id": asset.id, "alias": _display_alias(asset)}


@router.post("/check-references")
def check_media_references(ids: List[int], db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
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

        # Aguja de búsqueda por URL/nombre (para refs externas/legacy) + ID
        needles = {(asset.url or "").lower(), (asset.filename or "").lower()}

        # 3. Comprobar asociaciones con Secciones del CMS (Homepage) — por ID o url/nombre
        sections = db.exec(select(HomepageSection)).all()
        for sec in sections:
            if _json_references_asset(sec.config, asset_id, needles):
                associations.append({
                    "type": "homepage",
                    "name": f"CMS Homepage - Sección: {sec.title} ({sec.type})",
                    "id": sec.id
                })

        # 4. Comprobar asociaciones con Configuraciones del sitio (modal de bienvenida, etc.)
        SETTING_LABELS = {
            "welcome_modal": "Modal de Bienvenida",
            "top_banner": "Barra de Anuncios",
        }
        for st in db.exec(select(SiteSetting)).all():
            if _json_references_asset(st.value, asset_id, needles):
                associations.append({
                    "type": "setting",
                    "name": f"Configuración: {SETTING_LABELS.get(st.key, st.key)}",
                    "id": st.key
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
async def delete_media_batch(ids: List[int], db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
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
async def rename_media_batch(mapping: Dict[int, str], db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
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

            # 2. Actualizar MediaAsset (relacional: productos/variantes y bloques por asset_id
            #    no se tocan; resuelven la url al leer).
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
