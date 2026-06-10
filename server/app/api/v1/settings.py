from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from ...database import get_session
from ...models.settings import SiteSetting
from pydantic import BaseModel

router = APIRouter()

class SettingUpdate(BaseModel):
    value: Dict[str, Any]

@router.get("")
def get_all_settings(session: Session = Depends(get_session)):
    """Obtiene todas las configuraciones del sitio en formato objeto."""
    settings = session.exec(select(SiteSetting)).all()
    return {s.key: s.value for s in settings}

@router.get("/{key}")
def get_setting(key: str, session: Session = Depends(get_session)):
    """Obtiene una configuración específica por su clave."""
    setting = session.exec(select(SiteSetting).where(SiteSetting.key == key)).first()
    if not setting:
        return {}
    return setting.value

@router.post("/{key}")
def update_setting(key: str, update: SettingUpdate, session: Session = Depends(get_session)):
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
