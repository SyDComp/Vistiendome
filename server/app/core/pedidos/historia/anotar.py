"""
Anotar en la historia de un pedido.

No hace commit: la anotación entra en la misma transacción que el cambio que
describe, y se guardan las dos o ninguna.
"""

from sqlalchemy import text
from sqlmodel import Session

from ....models.crm import Cotizacion
from ....models.historia import PedidoEvento
from .actor import Actor


def anotar(db: Session, cotizacion: Cotizacion, tipo: str, actor: Actor, **datos) -> PedidoEvento:
    evento = PedidoEvento(
        # El correlativo que ordena la historia (ver PedidoEvento.secuencia).
        secuencia=db.execute(text("SELECT nextval('pedido_eventos_secuencia_seq')")).scalar_one(),
        cotizacion_id=cotizacion.id,
        numero_pedido=cotizacion.numero,
        tipo=tipo,
        datos=datos,
        actor_cuenta_id=actor.cuenta_id,
        actor_nombre=actor.nombre,
    )
    db.add(evento)
    return evento
