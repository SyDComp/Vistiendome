"""La historia de un pedido, en el orden en que pasó."""

from typing import List

from sqlmodel import Session, select

from ....models.historia import PedidoEvento


def historia_de(db: Session, cotizacion_id: str) -> List[PedidoEvento]:
    # Por el correlativo, no por la hora: varias anotaciones de una misma
    # acción tienen la misma hora (ver PedidoEvento.secuencia).
    return db.exec(
        select(PedidoEvento)
        .where(PedidoEvento.cotizacion_id == cotizacion_id)
        .order_by(PedidoEvento.secuencia)
    ).all()
