"""
El arqueo del cajón de un día: el fondo con que partió y lo contado al cerrar.
La regla vive en core/caja/arqueo.py; el efectivo del día, en core/caja/cierre.py.
"""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.core import caja
from app.core.caja import arqueo
from app.core.pedidos import historia
from app.database import get_session
from app.models.iam import CuentaAcceso

router = APIRouter()
_ADMIN = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))


class ArqueoSalida(BaseModel):
    fecha: date
    fondo_inicial: Optional[int] = None
    fondo_propuesto: Optional[int] = None
    abierto_por: Optional[str] = None
    efectivo_del_dia: Optional[int] = None
    deberia: Optional[int] = None
    contado: Optional[int] = None
    diferencia: Optional[int] = None
    deja: Optional[int] = None
    nota: Optional[str] = None
    cerrado_por: Optional[str] = None
    cerrado_en: Optional[datetime] = None


class FondoEntrada(BaseModel):
    monto: int


class CierreEntrada(BaseModel):
    contado: int
    deja: Optional[int] = None
    nota: Optional[str] = Field(default=None, max_length=500)


def _salida(db: Session, dia: date) -> ArqueoSalida:
    efectivo = caja.cierre(db, dia).efectivo_en_cajon
    return ArqueoSalida(**vars(arqueo.del_dia(db, dia, efectivo)), efectivo_del_dia=efectivo)


@router.get("/arqueo", response_model=ArqueoSalida)
def ver(fecha: Optional[date] = None, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    return _salida(db, fecha or caja.hoy())


@router.put("/arqueo/{fecha}/fondo", response_model=ArqueoSalida)
def anotar_fondo(fecha: date, data: FondoEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    try:
        arqueo.anotar_fondo(db, fecha, data.monto, historia.de_cuenta(admin))
    except arqueo.NoSeAnota as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    return _salida(db, fecha)


@router.put("/arqueo/{fecha}/cierre", response_model=ArqueoSalida)
def cerrar(fecha: date, data: CierreEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    try:
        arqueo.cerrar(db, fecha, data.contado, data.deja, data.nota, historia.de_cuenta(admin))
    except arqueo.NoSeAnota as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    return _salida(db, fecha)
