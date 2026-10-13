"""
Confirmar un pedido: la clienta aceptó, y se decide de dónde sale cada prenda.

Es un servicio y no una ruta: la caja (Fase 2) va a confirmar igual.

LO QUE LA PERSONA VIO ES LO QUE SE CONFIRMA
Entre que se abre la propuesta y se aprieta "Confirmar", otro pedido pudo
llevarse la última unidad. Por eso se bloquean las variantes del pedido
(FOR UPDATE: dos confirmaciones de la misma variante van una detrás de otra),
se vuelve a calcular, y si alguna prenda que la persona vio apartada ahora
quedaría esperando —o al revés—, no se confirma: se devuelve la propuesta
nueva para que la vea.
"""

from datetime import date, datetime, timezone
from typing import Dict, List, Optional, Set

from sqlmodel import Session, select

from ....models.catalog import SKU
from ....models.crm import Cotizacion, EstadoCotizacion
from ....models.historia import TipoEvento
from .. import fecha as fecha_core
from ... import pagos
from ..historia import Actor, anotar
from .caminos import BODEGA, ESPERANDO, TALLER
from .propuesta import PrendaPropuesta, proponer
from ..prendas import activas

SE_CONFIRMAN = {EstadoCotizacion.NUEVA, EstadoCotizacion.EN_CONVERSACION}


class NoSeConfirma(Exception):
    """Falta algo para confirmar. El mensaje dice qué, en palabras de la tienda."""


class CambioLaBodega(Exception):
    """La bodega cambió desde que se vio la propuesta. Trae la nueva."""

    def __init__(self, propuesta: List[PrendaPropuesta]):
        super().__init__("La bodega cambió mientras confirmabas: revisa la propuesta de nuevo.")
        self.propuesta = propuesta


def abono_de(db: Session, cotizacion: Cotizacion, propuesta: List[PrendaPropuesta]) -> dict:
    """El abono mínimo de este pedido tal como se confirmaría, lo pagado y lo que falta."""
    total = sum(round((p.precio or 0) * p.cantidad) for p in propuesta)
    a = pagos.minimo(db, total, [p.camino for p in propuesta])
    pagado = pagos.cuentas(cotizacion, pagos.pagos_de(db, [cotizacion.id])[cotizacion.id]).pagado
    return {"minimo": a.minimo, "porcentaje": a.porcentaje, "por": a.por, "pagado": pagado,
            "falta": max(a.minimo - pagado, 0)}


def _lista(nombres: List[str]) -> str:
    return ", ".join(nombres)


def problemas(cotizacion: Cotizacion, propuesta: List[PrendaPropuesta], nota: Optional[str],
               fecha: Optional[date] = None, al_confirmar: bool = True, abono_faltante: int = 0) -> List[str]:
    """
    Lo que impide confirmar, en el orden en que conviene resolverlo. Vacío si
    se puede. `al_confirmar=False` para mostrar la propuesta: la nota y la
    fecha se completan en la misma pantalla, y avisar que faltan antes de que
    la vean sería ruido. `abono_faltante`: cuánto falta para el abono mínimo;
    si falta algo, se puede confirmar igual, pero con una nota.
    """
    estado = EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado))
    if estado not in SE_CONFIRMAN:
        return ["Solo se confirma un pedido nuevo o en conversación."]
    if not propuesta:
        return ["El pedido no tiene prendas: no hay nada que confirmar."]

    faltan = []
    sin_precio = [p.nombre for p in propuesta if p.precio is None]
    if sin_precio:
        faltan.append(f"Ponle precio a: {_lista(sin_precio)}.")
    sin_camino = [p.nombre for p in propuesta if p.camino is None]
    if sin_camino:
        faltan.append(f"Elige de dónde sale: {_lista(sin_camino)}.")
    sin_nota = not (nota or "").strip()
    if al_confirmar and any(p.requiere_nota for p in propuesta) and sin_nota:
        faltan.append("Escribe una nota: hay prendas que se confirman distinto de lo habitual.")
    if al_confirmar and abono_faltante > 0 and sin_nota:
        faltan.append(f"Falta {pagos.pesos(abono_faltante)} para el abono mínimo: regístralo, "
                      "o escribe una nota de por qué se confirma sin él.")
    if al_confirmar and fecha_core.no_sirve(fecha):
        faltan.append(fecha_core.no_sirve(fecha))
    return faltan


def confirmar(
    db: Session,
    cotizacion: Cotizacion,
    elegidos: Dict[str, str],
    nota: Optional[str],
    esperando_vistas: Set[str],
    actor: Actor,
    fecha: Optional[date] = None,
) -> List[PrendaPropuesta]:
    """
    Confirma con los caminos `elegidos` y la `fecha` comprometida.
    `esperando_vistas`: las prendas que la persona vio "esperando bodega" al
    decidir. Devuelve la propuesta aplicada. No hace commit.
    """
    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) not in SE_CONFIRMAN:
        raise NoSeConfirma("Solo se confirma un pedido nuevo o en conversación.")

    sku_ids = sorted({it.sku_id for it in activas(cotizacion) if it.sku_id})
    if sku_ids:
        # En orden de id: dos confirmaciones que bloquean las mismas variantes
        # en distinto orden se trabarían entre ellas.
        db.exec(select(SKU.id).where(SKU.id.in_(sku_ids)).order_by(SKU.id).with_for_update()).all()

    propuesta = proponer(db, cotizacion, elegidos)
    if {p.item_id for p in propuesta if p.queda == ESPERANDO} != set(esperando_vistas):
        raise CambioLaBodega(propuesta)

    abono = abono_de(db, cotizacion, propuesta)
    faltan = problemas(cotizacion, propuesta, nota, fecha, abono_faltante=abono["falta"])
    if faltan:
        raise NoSeConfirma(" ".join(faltan))

    por_id = {it.id: it for it in cotizacion.items}
    for p in propuesta:
        por_id[p.item_id].camino = p.camino
        db.add(por_id[p.item_id])

    anterior = getattr(cotizacion.estado, "value", cotizacion.estado)
    cotizacion.estado = EstadoCotizacion.CONFIRMADA
    cotizacion.confirmada_en = datetime.now(timezone.utc)
    cotizacion.fecha_comprometida = fecha
    db.add(cotizacion)

    nota = (nota or "").strip() or None
    anotar(
        db, cotizacion, TipoEvento.ESTADO, actor,
        de=anterior, a=EstadoCotizacion.CONFIRMADA.value,
        bodega=sum(1 for p in propuesta if p.camino == BODEGA),
        taller=sum(1 for p in propuesta if p.camino == TALLER),
        esperando=[p.nombre for p in propuesta if p.queda == ESPERANDO],
        nota=nota,
        fecha=fecha.isoformat(),
        abono_faltante=abono["falta"] or None,
    )
    return propuesta
