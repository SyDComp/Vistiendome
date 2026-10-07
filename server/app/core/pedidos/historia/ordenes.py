"""
Lo que una orden de corte le hace a los pedidos de sus prendas.

Una orden puede mezclar prendas de varios pedidos y prendas para stock. Cada
pedido recibe UNA anotación con cuántas de sus prendas tocó la orden; las de
stock no son de nadie y no se anotan en ningún pedido.
"""

from collections import defaultdict
from typing import Dict, List, Tuple

from sqlmodel import Session

from ....models.crm import Cotizacion, CotizacionItem
from ....models.taller import OrdenCorte
from .actor import Actor
from .anotar import anotar


def pedidos_de(db: Session, orden: OrdenCorte) -> List[Tuple[Cotizacion, int]]:
    """Cada pedido con prendas en esta orden, y cuántas unidades suyas lleva."""
    unidades: Dict[str, int] = defaultdict(int)
    for linea in orden.items:
        if not linea.cotizacion_item_id:
            continue
        item = db.get(CotizacionItem, linea.cotizacion_item_id)
        if item:
            unidades[item.cotizacion_id] += linea.cantidad
    pedidos = []
    for cotizacion_id, n in unidades.items():
        cotizacion = db.get(Cotizacion, cotizacion_id)
        if cotizacion:
            pedidos.append((cotizacion, n))
    return pedidos


def anotar_en_sus_pedidos(db: Session, orden: OrdenCorte, tipo: str, actor: Actor, **datos) -> None:
    for cotizacion, prendas in pedidos_de(db, orden):
        anotar(db, cotizacion, tipo, actor, orden=orden.numero, prendas=prendas, **datos)
