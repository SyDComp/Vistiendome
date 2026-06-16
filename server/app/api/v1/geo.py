from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.database import get_session
from app.models.geo import Region, Comuna

router = APIRouter()

@router.get("/regiones", response_model=List[Region])
def listar_regiones(session: Session = Depends(get_session)):
    regiones = session.exec(select(Region).order_by(Region.nombre)).all()
    return regiones

@router.get("/regiones/{region_id}/comunas", response_model=List[Comuna])
def listar_comunas_por_region(region_id: int, session: Session = Depends(get_session)):
    comunas = session.exec(select(Comuna).where(Comuna.region_id == region_id).order_by(Comuna.nombre)).all()
    if not comunas:
        raise HTTPException(status_code=404, detail="No se encontraron comunas para esta región")
    return comunas
