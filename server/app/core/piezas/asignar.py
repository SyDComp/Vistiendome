"""
Asignar una pieza única a un pedido: entra como una prenda más, que sale de la
bodega y queda apartada desde ese momento (es una sola: no hay otra igual que
se la pueda llevar).

Solo a un pedido que se conversa, como cualquier prenda que se agrega.
"""

from typing import Optional

from sqlalchemy import func
from sqlmodel import Session, select

from ...models.crm import Cotizacion, CotizacionItem, EstadoCotizacion
from ...models.historia import TipoEvento
from ...models.piezas import PiezaUnica
from ..pedidos import precios
from ..pedidos.cotizar import ESTADOS_QUE_SE_COTIZAN
from ..pedidos.historia import Actor, anotar
from .estados import NoSePuede, apartar


def asignar(db: Session, pieza: PiezaUnica, cotizacion: Cotizacion, precio: Optional[float],
            sin_costo: bool, actor: Actor) -> CotizacionItem:
    """La pieza como prenda nueva de ese pedido. No hace commit."""
    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) not in ESTADOS_QUE_SE_COTIZAN:
        raise NoSePuede("Se asigna a un pedido nuevo o en conversación.")
    apartar(pieza)

    ultima = db.exec(
        select(func.max(CotizacionItem.posicion)).where(CotizacionItem.cotizacion_id == cotizacion.id)
    ).one()
    item = CotizacionItem(
        cotizacion_id=cotizacion.id,
        posicion=(ultima + 1) if ultima is not None else 0,
        producto_id=pieza.producto_id,
        cantidad=1,
        precio_unitario_estimado=precios.normalizar(precio, sin_costo),
        nombre_custom=pieza.nombre,
        config_custom=dict(pieza.config or {}) or None,
        config_propuesta=dict(pieza.config_propuesta or {}) or None,
        pieza_id=pieza.id,
    )
    db.add(item)
    db.add(pieza)
    db.flush()
    anotar(db, cotizacion, TipoEvento.PRENDA_AGREGADA, actor,
           prenda=f"{pieza.nombre} (pieza única N° {pieza.numero})", cantidad=1,
           precio=item.precio_unitario_estimado)
    return item
