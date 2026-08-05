from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from ...database import get_session
from ...models.settings import SiteSetting
from ...models.catalog import MediaAsset
from pydantic import BaseModel
from ...api.deps import RequirePermiso
from ...models.iam import CuentaAcceso

router = APIRouter()

class SettingUpdate(BaseModel):
    value: Any


def _resolve_media_refs(key: str, value: Any, session: Session) -> Any:
    """
    Resuelve referencias por ID a la URL ACTUAL del asset (robusto ante renombrados).
    Si el valor tiene 'image_asset_id', inyecta 'image_url' con la url vigente.
    """
    if not isinstance(value, dict):
        return value
    asset_id = value.get("image_asset_id")
    if asset_id:
        asset = session.get(MediaAsset, asset_id)
        if asset:
            return {**value, "image_url": asset.url}
    return value

@router.get("")
def get_all_settings(session: Session = Depends(get_session)):
    """Obtiene todas las configuraciones del sitio en formato objeto."""
    settings = session.exec(select(SiteSetting)).all()
    return {s.key: _resolve_media_refs(s.key, s.value, session) for s in settings}

@router.get("/{key}")
def get_setting(key: str, session: Session = Depends(get_session)):
    """Obtiene una configuración específica por su clave."""
    setting = session.exec(select(SiteSetting).where(SiteSetting.key == key)).first()
    if not setting:
        return {}
    return _resolve_media_refs(setting.key, setting.value, session)

@router.post("/{key}")
def update_setting(key: str, update: SettingUpdate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Crea o actualiza una configuración."""
    setting = session.exec(select(SiteSetting).where(SiteSetting.key == key)).first()
    if not setting:
        setting = SiteSetting(key=key, value=update.value)
        session.add(setting)
    else:
        # Forzamos la detección de cambios en el JSONB
        setting.value = update.value
        session.add(setting)
    
    session.commit()
    session.refresh(setting)
    return setting.value
