"""
Bodega › Piezas únicas: verlas, asignarlas a un pedido y darlas de baja.

La regla vive en core/piezas/: acá solo se traduce a HTTP.
"""

from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.deps import RequirePermiso
from app.api.v1.crm import leer_pedidos
from app.core import piezas as core
from app.core.pedidos import historia
from app.database import get_session
from app.models.crm import Cotizacion, CotizacionItem
from app.models.iam import CuentaAcceso
from app.models.piezas import EstadoPieza, PiezaUnica

router = APIRouter(dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])


class PiezaSalida(BaseModel):
    id: str
    numero: Optional[int] = None
    nombre: str
    config: Dict[str, str] = {}
    config_propuesta: Dict[str, str] = {}
    estado: EstadoPieza
    nota: Optional[str] = None
    origen_pedido_numero: Optional[int] = None
    # El pedido en el que está ahora (apartada) o con el que salió (vendida).
    pedido_id: Optional[str] = None
    pedido_numero: Optional[int] = None
    creada_en: datetime


class AsignarEntrada(BaseModel):
    cotizacion_id: str
    # Sin monto y sin `sin_costo`: por cotizar.
    precio: Optional[float] = Field(default=None, gt=0)
    sin_costo: bool = False


class BajaEntrada(BaseModel):
    nota: str = Field(max_length=500)


def _salida(pieza: PiezaUnica, pedidos: Dict[str, Cotizacion]) -> PiezaSalida:
    pedido = pedidos.get(pieza.id)
    return PiezaSalida(
        **pieza.model_dump(include={"id", "numero", "nombre", "config", "config_propuesta", "estado",
                                    "nota", "origen_pedido_numero", "creada_en"}),
        pedido_id=pedido.id if pedido else None,
        pedido_numero=pedido.numero if pedido else None,
    )


def _pedidos_de(db: Session, pieza_ids: List[str]) -> Dict[str, Cotizacion]:
    """{pieza_id: el pedido donde está como prenda activa}, en una consulta."""
    if not pieza_ids:
        return {}
    filas = db.exec(
        select(CotizacionItem.pieza_id, Cotizacion)
        .join(Cotizacion, CotizacionItem.cotizacion_id == Cotizacion.id)
        .where(CotizacionItem.pieza_id.in_(pieza_ids), CotizacionItem.cancelada_en.is_(None))
    ).all()
    return {pieza_id: pedido for pieza_id, pedido in filas}


def _pieza(db: Session, pieza_id: str) -> PiezaUnica:
    pieza = db.get(PiezaUnica, pieza_id)
    if not pieza:
        raise HTTPException(status_code=404, detail="Pieza única no encontrada")
    return pieza


@router.get("/", response_model=List[PiezaSalida])
def listar(db: Session = Depends(get_session)):
    """Todas, las disponibles primero; las dadas de baja al final."""
    orden = {EstadoPieza.DISPONIBLE: 0, EstadoPieza.APARTADA: 1, EstadoPieza.VENDIDA: 2, EstadoPieza.BAJA: 3}
    todas = sorted(db.exec(select(PiezaUnica)).all(), key=lambda p: (orden[EstadoPieza(p.estado)], -(p.numero or 0)))
    pedidos = _pedidos_de(db, [p.id for p in todas])
    return [_salida(p, pedidos) for p in todas]


@router.post("/{pieza_id}/asignar")
def asignar(pieza_id: str, data: AsignarEntrada, db: Session = Depends(get_session),
            admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """La pieza entra como prenda del pedido, apartada. Devuelve el pedido."""
    pieza = _pieza(db, pieza_id)
    cotizacion = db.get(Cotizacion, data.cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    try:
        core.asignar(db, pieza, cotizacion, data.precio, data.sin_costo, historia.de_cuenta(admin))
    except core.NoSePuede as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    db.refresh(cotizacion)
    return leer_pedidos(db, [cotizacion])[0]


@router.post("/{pieza_id}/baja", response_model=PiezaSalida)
def dar_de_baja(pieza_id: str, data: BajaEntrada, db: Session = Depends(get_session)):
    pieza = _pieza(db, pieza_id)
    try:
        core.dar_de_baja(pieza, data.nota)
    except core.NoSePuede as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.add(pieza)
    db.commit()
    db.refresh(pieza)
    return _salida(pieza, {})
