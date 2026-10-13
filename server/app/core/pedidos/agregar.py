"""
Poner una prenda en un pedido: al crearlo, o después, mientras se conversa.

El camino habitual de un pedido que llega por la web solo con un mensaje (un
pedido grupal, una consulta): se conversa por WhatsApp y las prendas que se
acuerdan se agregan a ESE pedido, no a uno nuevo. Así el número que conoce la
clienta y la historia de lo conversado siguen siendo uno solo.

Solo mientras el pedido está nuevo o en conversación: agregar una prenda a un
pedido confirmado cambia lo acordado, y para eso primero se vuelve atrás.
"""

from sqlalchemy import func
from sqlmodel import Session, select

from ...models.crm import Cotizacion, CotizacionItem, EstadoCotizacion
from ...models.historia import TipoEvento
from .. import propuestas as core_propuestas
from .cotizar import ESTADOS_QUE_SE_COTIZAN, nombre_de_prenda
from .historia import Actor, anotar
from .prendas import prenda_desde


class NoSeAgrega(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


def poner_prenda(session: Session, cotizacion: Cotizacion, entrada, posicion: int,
                 permitir_sin_costo: bool) -> CotizacionItem:
    """
    La prenda de `entrada` (un CotizacionItemCreate) en ese pedido. No hace commit.

    Qué prenda es —variante, personalizada de un producto o escrita a mano— y
    su precio en tres estados: ver prendas.py.
    """
    item = CotizacionItem(
        cotizacion_id=cotizacion.id,
        posicion=posicion,
        **prenda_desde(session, entrada, permitir_sin_costo),
    )
    session.add(item)

    # Lo que el cliente propuso y no existe en el catalogo queda registrado
    # como propuesta, con quien la pidio y de que pedido salio. El pedido no
    # se cae si algo de esto falla: registrar es un efecto, no el objetivo.
    if entrada.config_propuesta:
        try:
            core_propuestas.registrar(
                session,
                entrada.config_propuesta,
                persona_id=cotizacion.persona_id,
                cotizacion_id=cotizacion.id,
            )
        except Exception:
            pass
    return item


def agregar(db: Session, cotizacion: Cotizacion, entrada, actor: Actor) -> CotizacionItem:
    """Agrega la prenda al final del pedido y lo anota. Solo el panel: puede ser sin costo. No hace commit."""
    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) not in ESTADOS_QUE_SE_COTIZAN:
        raise NoSeAgrega(
            "Las prendas se agregan mientras el pedido está nuevo o en conversación. "
            "Si ya está confirmado, vuélvelo a «En conversación»."
        )
    ultima = db.exec(
        select(func.max(CotizacionItem.posicion)).where(CotizacionItem.cotizacion_id == cotizacion.id)
    ).one()
    item = poner_prenda(db, cotizacion, entrada, posicion=(ultima + 1) if ultima is not None else 0,
                        permitir_sin_costo=True)
    db.flush()
    db.refresh(item)
    anotar(db, cotizacion, TipoEvento.PRENDA_AGREGADA, actor,
           prenda=nombre_de_prenda(item), cantidad=item.cantidad, precio=item.precio_unitario_estimado)
    return item
