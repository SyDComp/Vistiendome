from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from ...database import get_session
from ...models.settings import SiteSetting
from ...models.catalog import MediaAsset
from pydantic import BaseModel
from ...api.deps import RequirePermiso
from ...models.iam import CuentaAcceso
from ...core import metodos_envio, promociones, tramos

# Ajustes que el panel lee y guarda como siempre, pero que viven en tablas con
# enlaces de verdad (a características, opciones y productos): su lectura y su
# guardado, y el error que explica por qué no se pudo guardar.
EN_TABLAS = {
    tramos.CLAVE: (tramos.como_ajuste, tramos.guardar, tramos.TramoInvalido),
    promociones.CLAVE: (promociones.como_ajuste, promociones.guardar, promociones.PromocionInvalida),
    metodos_envio.CLAVE_METODOS: (metodos_envio.leer_metodos, metodos_envio.guardar_metodos, metodos_envio.EnvioInvalido),
    metodos_envio.CLAVE_COLORES: (metodos_envio.leer_colores, metodos_envio.guardar_colores, metodos_envio.EnvioInvalido),
}

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
    todos = {s.key: _resolve_media_refs(s.key, s.value, session) for s in settings}
    for clave, (leer, _, _) in EN_TABLAS.items():
        todos[clave] = leer(session)
    return todos

@router.get("/{key}")
def get_setting(key: str, session: Session = Depends(get_session)):
    """Obtiene una configuración específica por su clave."""
    if key in EN_TABLAS:
        return EN_TABLAS[key][0](session)
    setting = session.exec(select(SiteSetting).where(SiteSetting.key == key)).first()
    if not setting:
        return {}
    return _resolve_media_refs(setting.key, setting.value, session)

@router.post("/{key}")
def update_setting(key: str, update: SettingUpdate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Crea o actualiza una configuración."""
    if key in EN_TABLAS:
        leer, guardar, invalido = EN_TABLAS[key]
        try:
            guardar(session, update.value)
        except invalido as e:
            session.rollback()
            raise HTTPException(status_code=422, detail=str(e))
        session.commit()
        return leer(session)
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
