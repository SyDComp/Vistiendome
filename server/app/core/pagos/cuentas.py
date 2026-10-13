"""
Las cuentas de un pedido: total, pagado, saldo y en qué está el pago.

Se calcula, no se guarda: el total sale de las prendas activas (las canceladas
no se cobran) y lo pagado, de los pagos no anulados. Cambiar un precio o
cancelar una prenda mueve el saldo solo.

Si alguna prenda sigue "por cotizar", el total está incompleto: se sabe lo
pagado, pero no cuánto falta.
"""

from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple

from sqlmodel import Session, select

from ...models.crm import Cotizacion
from ...models.pagos import Pago, TipoPago
from ..pedidos.prendas import activas

SIN_PAGAR = "SIN_PAGAR"
ABONADO = "ABONADO"
PAGADO = "PAGADO"
PAGADO_DE_MAS = "PAGADO_DE_MAS"


@dataclass
class Cuentas:
    total: int = 0          # lo que suman las prendas con monto
    por_cotizar: int = 0    # prendas sin precio todavía: el total está incompleto
    pagado: int = 0         # pagos menos devoluciones, sin los anulados
    saldo: int = 0          # total - pagado (negativo: pagado de más)
    estado: str = SIN_PAGAR


def total_de(cotizacion: Cotizacion) -> Tuple[int, int]:
    """(total en pesos, prendas por cotizar), de las prendas activas."""
    total, por_cotizar = 0, 0
    for item in activas(cotizacion):
        if item.precio_unitario_estimado is None:
            por_cotizar += 1
        else:
            total += round(item.precio_unitario_estimado * item.cantidad)
    return total, por_cotizar


def cuentas(cotizacion: Cotizacion, pagos: Iterable[Pago]) -> Cuentas:
    total, por_cotizar = total_de(cotizacion)
    pagado = sum(
        (p.monto if p.tipo == TipoPago.PAGO else -p.monto)
        for p in pagos if p.anulado_en is None
    )
    c = Cuentas(total=total, por_cotizar=por_cotizar, pagado=pagado, saldo=total - pagado)
    if pagado <= 0:
        # Todo sin costo: no hay nada que pagar.
        nada_que_pagar = total == 0 and not por_cotizar and bool(activas(cotizacion))
        c.estado = PAGADO if nada_que_pagar else SIN_PAGAR
    elif por_cotizar or pagado < total:
        c.estado = ABONADO
    elif pagado == total:
        c.estado = PAGADO
    else:
        c.estado = PAGADO_DE_MAS
    return c


def pagos_de(db: Session, cotizacion_ids: List[str]) -> Dict[str, List[Pago]]:
    """{pedido_id: [pagos, del más antiguo al más nuevo]}, en una consulta."""
    if not cotizacion_ids:
        return {}
    resultado: Dict[str, List[Pago]] = {i: [] for i in cotizacion_ids}
    for pago in db.exec(
        select(Pago).where(Pago.cotizacion_id.in_(cotizacion_ids)).order_by(Pago.registrado_en, Pago.id)
    ).all():
        resultado[pago.cotizacion_id].append(pago)
    return resultado
