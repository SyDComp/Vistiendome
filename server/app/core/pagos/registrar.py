"""
Registrar un pago de un pedido, o anular uno mal anotado.

Las reglas de cuándo se exige pagar (abono al confirmar, pago completo para
despachar) son de la entrega siguiente: acá solo se anota bien lo que pasó.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session

from ...models.crm import Cotizacion, EstadoCotizacion
from ...models.historia import TipoEvento
from ...models.pagos import Pago, TipoPago
from .. import ajustes_negocio
from ..pedidos.historia import Actor, anotar
from .cuentas import cuentas, pagos_de


class NoSeRegistra(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


def pesos(monto: int) -> str:
    """$17.490, como se escribe en Chile."""
    return "$" + f"{monto:,}".replace(",", ".")


def registrar(db: Session, cotizacion: Cotizacion, monto: int, medio: str, nota: Optional[str], actor: Actor) -> Pago:
    """Anota un pago y lo deja en la historia. No hace commit."""
    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) == EstadoCotizacion.CANCELADA:
        raise NoSeRegistra("El pedido está cancelado: no se le registran pagos.")
    if not isinstance(monto, int) or monto <= 0:
        raise NoSeRegistra("El monto tiene que ser un número de pesos mayor que cero.")
    medios = ajustes_negocio.leer(db, ajustes_negocio.MEDIOS_PAGO)
    if medio not in medios:
        raise NoSeRegistra(f'"{medio}" no es un medio de pago. Opciones: {", ".join(medios)}.')

    c = cuentas(cotizacion, pagos_de(db, [cotizacion.id])[cotizacion.id])
    if not c.por_cotizar and monto > c.saldo:
        raise NoSeRegistra(f"El pago ({pesos(monto)}) supera lo que falta pagar ({pesos(max(c.saldo, 0))}).")

    pago = Pago(
        cotizacion_id=cotizacion.id, tipo=TipoPago.PAGO, monto=monto, medio=medio,
        nota=(nota or "").strip() or None,
        registrado_por_id=actor.cuenta_id, registrado_por=actor.nombre,
    )
    db.add(pago)
    anotar(db, cotizacion, TipoEvento.PAGO, actor, monto=monto, medio=medio, nota=pago.nota)
    return pago


def anular(db: Session, cotizacion: Cotizacion, pago: Pago, motivo: Optional[str], actor: Actor) -> None:
    """Anula un pago mal anotado, con su motivo. No se borra. No hace commit."""
    if pago.anulado_en is not None:
        raise NoSeRegistra("Este pago ya estaba anulado.")
    motivo = (motivo or "").strip()
    if not motivo:
        raise NoSeRegistra("Escribe por qué se anula: queda en la historia del pedido.")
    pago.anulado_en = datetime.now(timezone.utc)
    pago.anulado_por = actor.nombre
    pago.anulado_motivo = motivo
    db.add(pago)
    anotar(db, cotizacion, TipoEvento.PAGO_ANULADO, actor, monto=pago.monto, medio=pago.medio, motivo=motivo)
