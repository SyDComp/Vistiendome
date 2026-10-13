"""
Los movimientos del libro de pagos de un pedido:

  · registrar un pago (también con el saldo a favor de la clienta);
  · lo pagado de más (se canceló el pedido o una prenda, bajó un precio):
    devolverlo, o dejarlo a favor de la clienta para otra compra;
  · anular cualquiera de ellos, con motivo.

Nada se borra ni se edita. Las reglas de cuándo se exige pagar (abono al
confirmar, saldo al despachar) viven en el ciclo del pedido.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session

from ...models.crm import Cotizacion, EstadoCotizacion
from ...models.historia import TipoEvento
from ...models.pagos import Pago, TipoPago
from .. import ajustes_negocio
from ..pedidos.historia import Actor, anotar
from .a_favor import MEDIO_A_FAVOR, disponible
from . import verificar
from .cuentas import Cuentas, cuentas, pagos_de


class NoSeRegistra(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


def pesos(monto: int) -> str:
    """$17.490, como se escribe en Chile."""
    return "$" + f"{monto:,}".replace(",", ".")


def _cuentas(db: Session, cotizacion: Cotizacion) -> Cuentas:
    return cuentas(cotizacion, pagos_de(db, [cotizacion.id])[cotizacion.id])


def _monto_valido(monto) -> None:
    if not isinstance(monto, int) or monto <= 0:
        raise NoSeRegistra("El monto tiene que ser un número de pesos mayor que cero.")


def _medio_valido(db: Session, medio: str) -> None:
    medios = ajustes_negocio.leer(db, ajustes_negocio.MEDIOS_PAGO)
    if medio not in medios:
        raise NoSeRegistra(f'"{medio}" no es un medio de pago. Opciones: {", ".join(medios)}.')


def _anotar_pago(db, cotizacion, actor, tipo, monto, medio, nota, **extra) -> Pago:
    pago = Pago(
        cotizacion_id=cotizacion.id, tipo=tipo, monto=monto, medio=medio,
        nota=(nota or "").strip() or None,
        registrado_por_id=actor.cuenta_id, registrado_por=actor.nombre,
    )
    db.add(pago)
    evento = {TipoPago.PAGO: TipoEvento.PAGO, TipoPago.DEVOLUCION: TipoEvento.DEVOLUCION,
              TipoPago.A_FAVOR: TipoEvento.A_FAVOR}[tipo]
    anotar(db, cotizacion, evento, actor, monto=monto, medio=medio, nota=pago.nota,
           **{k: v for k, v in extra.items() if v is not None})
    return pago


def registrar(db: Session, cotizacion: Cotizacion, monto: int, medio: str, nota: Optional[str], actor: Actor) -> Pago:
    """Anota un pago y lo deja en la historia. No hace commit."""
    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) == EstadoCotizacion.CANCELADA:
        raise NoSeRegistra("El pedido está cancelado: no se le registran pagos.")
    _monto_valido(monto)
    no_calza = []
    if medio == MEDIO_A_FAVOR:
        tiene = disponible(db, cotizacion.persona_id)
        if monto > tiene:
            raise NoSeRegistra(f"La clienta tiene {pesos(tiene)} a favor: no alcanza para {pesos(monto)}.")
        # ¿Es la misma persona que lo dejó? Si algo no calza, se puede seguir,
        # pero diciendo cómo se verificó.
        no_calza = verificar.avisos(db, cotizacion)
        if no_calza and not (nota or "").strip():
            raise NoSeRegistra(
                " ".join(no_calza) + " Escribe en la nota cómo verificaste que es la misma persona."
            )
    else:
        _medio_valido(db, medio)

    c = _cuentas(db, cotizacion)
    if not c.por_cotizar and monto > c.saldo:
        raise NoSeRegistra(f"El pago ({pesos(monto)}) supera lo que falta pagar ({pesos(max(c.saldo, 0))}).")
    return _anotar_pago(db, cotizacion, actor, TipoPago.PAGO, monto, medio, nota, verificacion=no_calza or None)


def _de_mas(db: Session, cotizacion: Cotizacion, monto: int) -> None:
    """Solo se devuelve o se deja a favor lo pagado de más, y no más que eso."""
    _monto_valido(monto)
    c = _cuentas(db, cotizacion)
    if c.saldo >= 0:
        raise NoSeRegistra("Este pedido no tiene nada pagado de más.")
    if monto > -c.saldo:
        raise NoSeRegistra(f"Lo pagado de más es {pesos(-c.saldo)}: no se puede mover {pesos(monto)}.")


def devolver(db: Session, cotizacion: Cotizacion, monto: int, medio: str, nota: Optional[str], actor: Actor) -> Pago:
    """Se le devuelve a la clienta lo pagado de más. No hace commit."""
    _de_mas(db, cotizacion, monto)
    _medio_valido(db, medio)
    return _anotar_pago(db, cotizacion, actor, TipoPago.DEVOLUCION, monto, medio, nota)


def dejar_a_favor(db: Session, cotizacion: Cotizacion, monto: int, nota: Optional[str], actor: Actor) -> Pago:
    """Lo pagado de más queda a favor de la clienta, para otra compra. No hace commit."""
    _de_mas(db, cotizacion, monto)
    return _anotar_pago(db, cotizacion, actor, TipoPago.A_FAVOR, monto, MEDIO_A_FAVOR, nota)


def anular(db: Session, cotizacion: Cotizacion, pago: Pago, motivo: Optional[str], actor: Actor) -> None:
    """Anula un movimiento mal anotado, con su motivo. No se borra. No hace commit."""
    if pago.anulado_en is not None:
        raise NoSeRegistra("Este pago ya estaba anulado.")
    motivo = (motivo or "").strip()
    if not motivo:
        raise NoSeRegistra("Escribe por qué se anula: queda en la historia del pedido.")
    if pago.tipo == TipoPago.A_FAVOR and disponible(db, cotizacion.persona_id) < pago.monto:
        raise NoSeRegistra("Ese saldo a favor ya se usó en otro pedido: anula primero ese pago.")
    pago.anulado_en = datetime.now(timezone.utc)
    pago.anulado_por = actor.nombre
    pago.anulado_motivo = motivo
    db.add(pago)
    anotar(db, cotizacion, TipoEvento.PAGO_ANULADO, actor, monto=pago.monto, medio=pago.medio, motivo=motivo,
           movimiento=pago.tipo)
