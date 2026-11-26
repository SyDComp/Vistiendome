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
from ...models.catalog import MediaAsset
from ...core import medios
from ...api.deps import RequirePermiso
from ...models.iam import CuentaAcceso
from ...core.imagenes import generar_derivadas, eliminar_derivadas, srcset_de
from ...core.imagen_valida import motivo_invalida

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

    # 1b. Que sea de verdad una imagen, antes de escribir nada (core/imagen_valida.py).
    motivo = motivo_invalida(file.file)
    if motivo:
        raise HTTPException(status_code=400, detail=motivo)

    # 2. Generar nombre único
    unique_filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Versiones livianas para no mandar la foto completa donde se ve chica.
        # Si falla, la subida NO se cae: el original ya está guardado y es lo
        # único irrecuperable. Las derivadas se pueden regenerar después.
        derivadas = {}
        try:
            derivadas = generar_derivadas(file_path, UPLOAD_DIR)
        except Exception as e:
            print(f"No se pudieron generar derivadas de {unique_filename}: {e}")

        # Inserción Relacional en la Base de Datos
        asset = MediaAsset(
            filename=unique_filename,
            original_name=file.filename,
            alias=_auto_alias(file.filename) or None,
            url=f"/media/{unique_filename}",
            mime_type=file.content_type,
            file_size=os.path.getsize(file_path),
            metadata_json={"derivadas": derivadas} if derivadas else {}
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

@router.get("/srcsets")
def mapa_srcsets(db: Session = Depends(get_session)):
    """
    Un solo mapa `url -> srcset` con TODAS las imágenes de la biblioteca.

    Existe porque el problema no era una pantalla: cada vista nueva que muestra
    fotos tiene que acordarse de pedir las derivadas, y ya se olvidó cuatro
    veces (galería, tarjetas del panel, selector de variantes, ficha de
    producto). Cada olvido son megabytes.

    Con esto el cliente lo pide una vez y cualquier imagen puede resolver sus
    derivadas por su URL, sin que el endpoint que la sirvió se haya acordado de
    nada. El precio es una petición chica y cacheada; la alternativa era tocar
    trece serializadores y volver a olvidarse en el siguiente.

    Sólo URLs y anchos: ni nombres de archivo, ni alias, ni nada de la biblioteca.
    """
    assets = db.exec(select(MediaAsset)).all()
    return {a.url: srcset_de(a) for a in assets if a.url and srcset_de(a)}


@router.get("/")
def list_media(db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Lista todos los archivos de medios (Directo desde la BD)"""
    # De la mas reciente a la mas antigua: quien abre la galeria viene casi
    # siempre de subir una foto y la busca arriba. Sin orden explicito, Postgres
    # devuelve las filas como quiere, y la recien subida podia caer al final de
    # 73 miniaturas.
    #
    # Se desempata por id porque varias fotos subidas en la misma tanda comparten
    # created_at al segundo, y sin desempate el orden entre ellas queda al azar
    # en cada consulta.
    assets = db.exec(
        select(MediaAsset).order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc())
    ).all()
    return [{
        "id": a.id,
        "url": a.url,
        # Miniatura liviana para la grilla: se muestra a ~390 px de ancho, así
        # que bajar el original (1805x2048, ~500 KB) era descargar 35 MB cada
        # vez que se abría la galería. El original queda en `url` para quien
        # necesite verlo en grande.
        "thumb": (a.metadata_json or {}).get("derivadas", {}).get("sm") or a.url,
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
    Dónde se usa cada foto: productos, variantes, portadas de colecciones,
    secciones de la portada y ajustes del sitio (core/medios).
    """
    results = []
    for asset_id in ids:
        asset = db.get(MediaAsset, asset_id)
        if not asset:
            continue
        associations = medios.donde_se_usa(db, asset)
        if associations:
            results.append({
                "media_id": asset_id,
                "filename": asset.filename,
                "original_name": asset.original_name,
                "associations": associations
            })
    return {
        "has_references": bool(results),
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
            # 1. La foto sale de todo lo que la usaba: productos, variantes,
            #    colecciones, portada y ajustes. Antes la portada y la bienvenida
            #    seguían con su dirección y en el sitio quedaba una imagen rota.
            medios.quitar_de_todo(db, asset)

            # Borrar la entidad MediaAsset
            db.delete(asset)
            db.commit()

            # 2. Eliminar archivo físico y sus versiones livianas, o quedarían
            # ocupando disco sin que nada las referencie.
            eliminar_derivadas(file_path, UPLOAD_DIR)
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
