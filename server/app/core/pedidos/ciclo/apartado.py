"""
Qué hay en bodega para cada pedido confirmado.

Una prenda que va por bodega no descuenta stock al confirmar: queda APARTADA.
Sigue físicamente en la bodega hasta que el pedido sale, pero ya no está
disponible para otro pedido.

NADA DE ESTO SE GUARDA
Se calcula de los pedidos confirmados y del libro de la bodega. No hay un
número de "apartados" que pueda quedar desfasado de los pedidos: cancelar,
volver atrás o despachar lo cambia solo.

QUIÉN SE LA LLEVA SI NO ALCANZA
El que confirmó antes. Una prenda se aparta entera o espera entera, y si una
espera, las que vienen detrás en la misma variante también esperan: nadie se
adelanta a quien confirmó primero. Cuando entra stock, se apartan solas en ese
mismo orden.
"""

from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

from sqlmodel import Session, select

from ....models.crm import Cotizacion, CotizacionItem, EstadoCotizacion
from ...existencias import existencias_de
from .caminos import APARTADA, BODEGA, ESPERANDO


@dataclass
class Bodega:
    """Una variante: lo que hay, lo comprometido con pedidos, y con quién."""
    hay: int = 0
    # Todo lo que piden los pedidos confirmados, alcance o no.
    apartado: int = 0
    # (prenda, pedido, APARTADA o ESPERANDO), en el orden en que se reparte.
    lineas: List[Tuple[CotizacionItem, Cotizacion, str]] = field(default_factory=list)

    @property
    def disponible(self) -> int:
        """Lo que queda libre. Negativo = faltan: hay pedidos esperando."""
        return self.hay - self.apartado


def _comprometidas(db: Session, sku_ids, excepto: Optional[str]) -> List[Tuple[CotizacionItem, Cotizacion]]:
    consulta = (
        select(CotizacionItem, Cotizacion)
        .join(Cotizacion, CotizacionItem.cotizacion_id == Cotizacion.id)
        .where(
            CotizacionItem.camino == BODEGA,
            CotizacionItem.sku_id.in_(sku_ids),
            Cotizacion.estado == EstadoCotizacion.CONFIRMADA,
        )
        .order_by(
            Cotizacion.confirmada_en.asc().nulls_first(),
            Cotizacion.numero.asc(),
            CotizacionItem.posicion.asc(),
            CotizacionItem.id.asc(),
        )
    )
    if excepto:
        consulta = consulta.where(Cotizacion.id != excepto)
    return db.exec(consulta).all()


def bodega_de(db: Session, sku_ids: Iterable[int], excepto_pedido: Optional[str] = None) -> Dict[int, Bodega]:
    """
    `{sku_id: Bodega}` para esas variantes, en dos consultas.

    `excepto_pedido`: se calcula como si ese pedido no estuviera confirmado
    (para proponer cómo confirmarlo).
    """
    ids = {i for i in sku_ids if i}
    if not ids:
        return {}
    hay = existencias_de(db, ids)
    resultado = {i: Bodega(hay=hay.get(i, 0)) for i in ids}
    restante = dict(hay)
    for item, pedido in _comprometidas(db, ids, excepto_pedido):
        b = resultado[item.sku_id]
        b.apartado += item.cantidad
        alcanza = restante.get(item.sku_id, 0) >= item.cantidad
        if alcanza:
            restante[item.sku_id] -= item.cantidad
        else:
            # Desde acá, nadie más se aparta esta variante: no se adelanta a
            # quien está esperando.
            restante[item.sku_id] = float("-inf")
        b.lineas.append((item, pedido, APARTADA if alcanza else ESPERANDO))
    return resultado


def estado_en_bodega(db: Session, cotizaciones: Iterable[Cotizacion]) -> Dict[str, str]:
    """`{prenda_id: APARTADA o ESPERANDO}` de las prendas por bodega de esos pedidos confirmados."""
    sku_ids = {
        it.sku_id
        for c in cotizaciones if c.estado == EstadoCotizacion.CONFIRMADA
        for it in c.items if it.camino == BODEGA and it.sku_id
    }
    estados: Dict[str, str] = {}
    for b in bodega_de(db, sku_ids).values():
        for item, _, estado in b.lineas:
            estados[item.id] = estado
    return estados
