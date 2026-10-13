"""
Las prendas de un pedido desde el panel: agregar y quitar mientras se conversa,
cancelar una vez confirmado.

La regla vive en core/pedidos/ (agregar.py, quitar.py, cancelar.py): acá solo
se traduce a HTTP.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.api.v1.crm import CotizacionItemCreate, leer_pedidos
from app.database import get_session
from app.core.pedidos import historia
from app.core.pedidos.agregar import NoSeAgrega, agregar
from app.core.pedidos.cancelar import NoSeCancela, cancelar_prenda
from app.core.pedidos.quitar import NoSeQuita, quitar
from app.models.crm import Cotizacion, CotizacionItem
from app.models.iam import CuentaAcceso

router = APIRouter()
_ADMIN = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))


def _pedido(db: Session, cotizacion_id: str) -> Cotizacion:
    cotizacion = db.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return cotizacion


@router.post("/cotizaciones/{cotizacion_id}/prendas")
def agregar_prenda(cotizacion_id: str, data: CotizacionItemCreate, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """Agrega una prenda al final del pedido. Devuelve el pedido como lo ve el panel."""
    cotizacion = _pedido(db, cotizacion_id)
    try:
        agregar(db, cotizacion, data, historia.de_cuenta(admin))
    except NoSeAgrega as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    db.refresh(cotizacion)
    return leer_pedidos(db, [cotizacion])[0]


@router.delete("/cotizaciones/{cotizacion_id}/prendas/{item_id}")
def quitar_prenda(cotizacion_id: str, item_id: str, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    cotizacion = _pedido(db, cotizacion_id)
    item = db.get(CotizacionItem, item_id)
    if not item or item.cotizacion_id != cotizacion.id:
        raise HTTPException(status_code=404, detail="Prenda no encontrada en este pedido")
    try:
        quitar(db, cotizacion, item, historia.de_cuenta(admin))
    except NoSeQuita as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    return {"ok": True}


@router.post("/cotizaciones/{cotizacion_id}/prendas/{item_id}/cancelar")
def cancelar(cotizacion_id: str, item_id: str, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """
    Cancela una prenda de un pedido confirmado. Devuelve el pedido: si no le
    queda ninguna prenda, la pantalla pregunta si se cancela entero.
    """
    cotizacion = _pedido(db, cotizacion_id)
    item = db.get(CotizacionItem, item_id)
    if not item or item.cotizacion_id != cotizacion.id:
        raise HTTPException(status_code=404, detail="Prenda no encontrada en este pedido")
    try:
        cancelar_prenda(db, cotizacion, item, historia.de_cuenta(admin))
    except NoSeCancela as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    db.refresh(cotizacion)
    return leer_pedidos(db, [cotizacion])[0]
