"""
Qué propone el sistema al confirmar un pedido: de dónde sale cada prenda.

El sistema propone y la persona decide. Para cada prenda:

  · Personalizada o escrita a mano: TALLER (no hay una variante que apartar).
  · Una variante con disponible: BODEGA.
  · Una variante sin disponible: lo que diga su categoría.
      Taller          → TALLER.
      Solo bodega     → BODEGA, esperando a que llegue.
      No dice nada    → no propone: la persona elige.

La persona puede cambiar cualquier camino. Si elige algo contra lo habitual
(BODEGA sin disponible, o TALLER en una categoría que no se confecciona), se
puede, pero con una nota: queda en la historia por qué se hizo así.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from sqlmodel import Session

from ....models.crm import Cotizacion, CotizacionItem
from ...categorias import SOLO_BODEGA, TALLER as CATEGORIA_TALLER, efectivos, etiqueta
from ..cotizar import nombre_de_prenda
from .apartado import bodega_de
from .caminos import APARTADA, BODEGA, ESPERANDO, TALLER


@dataclass
class PrendaPropuesta:
    item_id: str
    nombre: str
    cantidad: int
    precio: Optional[float]
    # Lo que propone el sistema (None: no sabe, elige la persona) y lo que
    # queda elegido.
    propuesto: Optional[str]
    camino: Optional[str]
    opciones: List[str] = field(default_factory=list)
    # Si va por bodega: APARTADA o ESPERANDO.
    queda: Optional[str] = None
    # Lo libre de esa variante antes de esta prenda. None si no es variante.
    disponible: Optional[int] = None
    # Lo que dice su categoría cuando no hay en bodega.
    categoria_dice: str = ""
    aviso: Optional[str] = None
    requiere_nota: bool = False


def _abastecimiento(item: CotizacionItem) -> Optional[str]:
    producto = item.sku.product if item.sku is not None else item.producto
    categoria = producto.category if producto is not None else None
    return efectivos(categoria).abastecimiento if categoria is not None else None


def _mostrable(disponible) -> Optional[int]:
    """Detrás de una prenda que espera no queda nada libre: se muestra 0, no "menos infinito"."""
    if disponible is None:
        return None
    return 0 if disponible == float("-inf") else int(disponible)


def _aviso(camino: Optional[str], queda: Optional[str], abastecimiento: Optional[str], disponible: Optional[int]) -> Optional[str]:
    if camino is None:
        return "No hay en bodega y su categoría no dice qué hacer: elige de dónde sale."
    if camino == BODEGA and queda == ESPERANDO:
        partes = [f"No hay en bodega (libres: {max(disponible or 0, 0)})."]
        if abastecimiento == SOLO_BODEGA:
            partes.append("Esta categoría no se confecciona en el taller.")
        partes.append("Si confirmas así, queda esperando a que llegue.")
        return " ".join(partes)
    if camino == TALLER and abastecimiento == SOLO_BODEGA:
        return "Esta categoría no se confecciona en el taller."
    return None


def proponer(db: Session, cotizacion: Cotizacion, elegidos: Optional[Dict[str, str]] = None) -> List[PrendaPropuesta]:
    """
    La propuesta para confirmar ese pedido, con lo `elegidos` por la persona
    (`{prenda_id: camino}`) por encima de lo que propone el sistema.

    Se calcula como si este pedido fuera el último en confirmarse: lo que ya
    apartaron otros no está libre para él.
    """
    elegidos = elegidos or {}
    items = list(cotizacion.items)
    bodega = bodega_de(db, {it.sku_id for it in items if it.sku_id}, excepto_pedido=cotizacion.id)
    restante = {sku_id: b.disponible for sku_id, b in bodega.items()}

    propuesta = []
    for item in items:
        abastecimiento = _abastecimiento(item)
        disponible = restante.get(item.sku_id) if item.sku_id else None

        if not item.sku_id:
            opciones, propuesto = [TALLER], TALLER
        else:
            opciones = [BODEGA, TALLER]
            if disponible >= item.cantidad:
                propuesto = BODEGA
            elif abastecimiento == CATEGORIA_TALLER:
                propuesto = TALLER
            elif abastecimiento == SOLO_BODEGA:
                propuesto = BODEGA
            else:
                propuesto = None

        elegido = elegidos.get(item.id)
        camino = elegido if elegido in opciones else propuesto

        queda = None
        if camino == BODEGA:
            queda = APARTADA if disponible >= item.cantidad else ESPERANDO
            # Lo que esta prenda toma ya no está para las siguientes; si
            # espera, las de detrás tampoco se adelantan.
            restante[item.sku_id] = disponible - item.cantidad if queda == APARTADA else float("-inf")

        propuesta.append(PrendaPropuesta(
            item_id=item.id,
            nombre=nombre_de_prenda(item),
            cantidad=item.cantidad,
            precio=item.precio_unitario_estimado,
            propuesto=propuesto,
            camino=camino,
            opciones=opciones,
            queda=queda,
            disponible=_mostrable(disponible),
            categoria_dice=etiqueta(abastecimiento),
            aviso=_aviso(camino, queda, abastecimiento, disponible),
            requiere_nota=(camino == BODEGA and queda == ESPERANDO)
                          or (camino == TALLER and abastecimiento == SOLO_BODEGA),
        ))
    return propuesta
