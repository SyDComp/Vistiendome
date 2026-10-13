"""
La bodega al despachar un pedido, y al deshacer el despacho.

Solo sale un pedido listo (ver listo.py) y pagado: todo apartado o hecho, y
sin saldo pendiente.

Solo las prendas que van por BODEGA salen de la bodega: las del taller se
hicieron para este pedido y nunca entraron a ella. Antes se descontaba todo, y
una prenda hecha en el taller se llevaba de la bodega una que era de otro.

Nada se borra: deshacer es otro movimiento, y lo que movió cada prenda es la
suma de lo anotado con su `reference_id` (ver core/movimientos.py).
"""

from sqlmodel import Session

from ....models.catalog import MovementType
from ....models.crm import Cotizacion
from ....models.piezas import PiezaUnica
from ... import movimientos, pagos, piezas
from ..prendas import activas
from .apartado import estado_en_bodega
from .caminos import BODEGA
from .listo import avance


class NoSeDespacha(Exception):
    """El pedido no está listo: el mensaje dice qué falta, prenda por prenda."""


def sacar(db: Session, cotizacion: Cotizacion) -> None:
    """
    Descuenta de la bodega las prendas por bodega. Llamar ANTES de cambiar el
    estado: con el pedido todavía confirmado se sabe qué tiene apartado.
    """
    a = avance(cotizacion, estado_en_bodega(db, [cotizacion]))
    if not a.listo:
        raise NoSeDespacha(f"Todavía no está listo para salir. Falta: {'; '.join(a.falta)}.")
    # Se paga todo antes de que salga: después no hay cómo cobrar (decisión
    # del usuario 2026-10-13). En un retiro, se cobra ahí mismo.
    c = pagos.cuentas(cotizacion, pagos.pagos_de(db, [cotizacion.id])[cotizacion.id])
    if c.saldo > 0:
        raise NoSeDespacha(f"Falta pagar {pagos.pesos(c.saldo)}: regístralo antes de que salga.")
    for item in activas(cotizacion):
        if item.pieza_id:
            pieza = db.get(PiezaUnica, item.pieza_id)
            piezas.vender(pieza)
            db.add(pieza)
            continue
        if item.camino != BODEGA or not item.sku_id:
            continue
        movimientos.llevar_a(
            db, sku_id=item.sku_id, reference_id=item.id, objetivo=-item.cantidad,
            tipo_si_resta=MovementType.SALE, tipo_si_suma=MovementType.RETURN,
            nota=f"Despacho pedido #{cotizacion.numero}",
        )


def devolver(db: Session, cotizacion: Cotizacion) -> None:
    """
    Deshace el despacho: devuelve lo que cada prenda sacó.

    Todas las prendas, no solo las de bodega: los pedidos despachados antes de
    que existieran los caminos descontaron todo, y eso también se devuelve. Las
    canceladas no: no salieron (y si estaban hechas, lo que entró a bodega se
    queda ahí).
    """
    for item in activas(cotizacion):
        if item.pieza_id:
            pieza = db.get(PiezaUnica, item.pieza_id)
            piezas.devolver(pieza)
            db.add(pieza)
            continue
        if not item.sku_id:
            continue
        movimientos.llevar_a(
            db, sku_id=item.sku_id, reference_id=item.id, objetivo=0,
            tipo_si_resta=MovementType.SALE, tipo_si_suma=MovementType.RETURN,
            nota=f"Se deshizo el despacho del pedido #{cotizacion.numero}",
        )
