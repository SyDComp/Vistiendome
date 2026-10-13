"""
Las piezas únicas que nacen de una prenda personalizada hecha y cancelada.

Idempotente, como el libro de la bodega: `llevar_a` deja tantas piezas vivas
de esa prenda como se le pida. Terminar dos veces la misma orden no crea el
doble; reabrirla da de baja las que sobran (solo si siguen disponibles: una ya
asignada a otro pedido existe de verdad y no se toca).
"""

from datetime import datetime, timezone

from sqlalchemy import text
from sqlmodel import Session, select

from ...models.crm import CotizacionItem
from ...models.piezas import EstadoPieza, PiezaUnica


def _nombre(item: CotizacionItem) -> str:
    if item.nombre_custom:
        return item.nombre_custom
    return item.producto.name if item.producto is not None else "Pieza personalizada"


def llevar_a(db: Session, item: CotizacionItem, unidades: int, pedido_numero, nota_baja: str) -> int:
    """
    Deja `unidades` piezas vivas (no dadas de baja) salidas de esa prenda.
    Devuelve cuántas creó (negativo: cuántas dio de baja). No hace commit.
    """
    vivas = db.exec(
        select(PiezaUnica)
        .where(PiezaUnica.origen_item_id == item.id, PiezaUnica.estado != EstadoPieza.BAJA)
        .order_by(PiezaUnica.numero)
    ).all()
    diferencia = unidades - len(vivas)
    for _ in range(max(diferencia, 0)):
        db.add(PiezaUnica(
            numero=db.execute(text("SELECT nextval('piezas_unicas_numero_seq')")).scalar_one(),
            nombre=_nombre(item),
            producto_id=item.producto_id,
            config=dict(item.config_custom or {}),
            config_propuesta=dict(item.config_propuesta or {}),
            origen_item_id=item.id,
            origen_pedido_numero=pedido_numero,
        ))
    sobran = [p for p in reversed(vivas) if p.estado == EstadoPieza.DISPONIBLE][:max(-diferencia, 0)]
    for pieza in sobran:
        pieza.estado = EstadoPieza.BAJA
        pieza.nota = nota_baja
        pieza.actualizada_en = datetime.now(timezone.utc)
        db.add(pieza)
    return diferencia if diferencia > 0 else -len(sobran)
