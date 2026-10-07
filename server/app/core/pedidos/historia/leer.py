"""La historia de un pedido, en el orden en que pasó."""

from typing import List

from sqlmodel import Session, select

from ....models.historia import PedidoEvento


def historia_de(db: Session, cotizacion_id: str) -> List[PedidoEvento]:
    # El id (ULID) desempata dos anotaciones del mismo instante en el orden en
    # que se escribieron.
    return db.exec(
        select(PedidoEvento)
        .where(PedidoEvento.cotizacion_id == cotizacion_id)
        .order_by(PedidoEvento.ocurrido_at, PedidoEvento.id)
    ).all()
