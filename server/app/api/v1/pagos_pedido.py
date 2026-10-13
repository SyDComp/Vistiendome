"""
Los pagos de un pedido desde el panel: verlos, registrar uno y anular uno.

La regla vive en core/pagos/: acá solo se traduce a HTTP.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.core import pagos as core
from app.core.pedidos import historia
from app.database import get_session
from app.models.crm import Cotizacion
from app.models.iam import CuentaAcceso
from app.models.pagos import Pago

router = APIRouter()
_ADMIN = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))


class CuentasSalida(BaseModel):
    total: int
    por_cotizar: int
    pagado: int
    saldo: int
    estado: str


class PagoSalida(BaseModel):
    id: str
    tipo: str
    monto: int
    medio: str
    nota: Optional[str] = None
    registrado_por: Optional[str] = None
    registrado_en: datetime
    anulado_en: Optional[datetime] = None
    anulado_por: Optional[str] = None
    anulado_motivo: Optional[str] = None


class PagosSalida(BaseModel):
    cuentas: CuentasSalida
    pagos: List[PagoSalida]
    # Lo que la clienta tiene a favor de otras compras: se puede usar para pagar.
    a_favor_disponible: int = 0
    # De qué pedidos viene (con el nombre y el teléfono que se dieron ahí) y
    # qué no calza con este pedido. Ver core/pagos/verificar.py.
    a_favor_origenes: List[dict] = []
    a_favor_avisos: List[str] = []


class PagoEntrada(BaseModel):
    monto: int = Field(gt=0)
    medio: str = Field(max_length=60)
    nota: Optional[str] = Field(default=None, max_length=300)


class DevolverEntrada(BaseModel):
    monto: int = Field(gt=0)
    medio: str = Field(max_length=60)
    nota: Optional[str] = Field(default=None, max_length=300)


class AFavorEntrada(BaseModel):
    monto: int = Field(gt=0)
    nota: Optional[str] = Field(default=None, max_length=300)


class AnularEntrada(BaseModel):
    motivo: str = Field(max_length=300)


def _pedido(db: Session, cotizacion_id: str) -> Cotizacion:
    cotizacion = db.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return cotizacion


def _salida(db: Session, cotizacion: Cotizacion) -> PagosSalida:
    pagos = core.pagos_de(db, [cotizacion.id])[cotizacion.id]
    return PagosSalida(
        cuentas=CuentasSalida(**vars(core.cuentas(cotizacion, pagos))),
        pagos=[PagoSalida(**p.model_dump()) for p in reversed(pagos)],  # el más nuevo primero
        a_favor_disponible=core.disponible(db, cotizacion.persona_id),
        a_favor_origenes=[o._asdict() for o in core.origenes(db, cotizacion.persona_id)
                          if o.pedido_numero != cotizacion.numero],
        a_favor_avisos=core.avisos(db, cotizacion),
    )


@router.get("/cotizaciones/{cotizacion_id}/pagos", response_model=PagosSalida)
def ver(cotizacion_id: str, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    return _salida(db, _pedido(db, cotizacion_id))


@router.post("/cotizaciones/{cotizacion_id}/pagos", response_model=PagosSalida)
def registrar(cotizacion_id: str, data: PagoEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    cotizacion = _pedido(db, cotizacion_id)
    try:
        core.registrar(db, cotizacion, data.monto, data.medio, data.nota, historia.de_cuenta(admin))
    except core.NoSeRegistra as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    return _salida(db, cotizacion)


@router.post("/cotizaciones/{cotizacion_id}/pagos/devolver", response_model=PagosSalida)
def devolver(cotizacion_id: str, data: DevolverEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """Se le devuelve a la clienta lo pagado de más."""
    cotizacion = _pedido(db, cotizacion_id)
    try:
        core.devolver(db, cotizacion, data.monto, data.medio, data.nota, historia.de_cuenta(admin))
    except core.NoSeRegistra as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    return _salida(db, cotizacion)


@router.post("/cotizaciones/{cotizacion_id}/pagos/a-favor", response_model=PagosSalida)
def a_favor(cotizacion_id: str, data: AFavorEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """Lo pagado de más queda a favor de la clienta, para otra compra."""
    cotizacion = _pedido(db, cotizacion_id)
    try:
        core.dejar_a_favor(db, cotizacion, data.monto, data.nota, historia.de_cuenta(admin))
    except core.NoSeRegistra as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    return _salida(db, cotizacion)


@router.post("/cotizaciones/{cotizacion_id}/pagos/{pago_id}/anular", response_model=PagosSalida)
def anular(cotizacion_id: str, pago_id: str, data: AnularEntrada, db: Session = Depends(get_session),
           admin: CuentaAcceso = _ADMIN):
    cotizacion = _pedido(db, cotizacion_id)
    pago = db.get(Pago, pago_id)
    if not pago or pago.cotizacion_id != cotizacion.id:
        raise HTTPException(status_code=404, detail="Pago no encontrado en este pedido")
    try:
        core.anular(db, cotizacion, pago, data.motivo, historia.de_cuenta(admin))
    except core.NoSeRegistra as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    return _salida(db, cotizacion)
