"""
La fecha comprometida de un pedido: para cuándo se le prometió a la clienta.

Al confirmar se propone sola: hoy más el plazo habitual (Ajustes del negocio),
en días hábiles de lunes a viernes. Si algo lo hace el taller, manda el plazo
del taller; si todo sale de bodega, el de bodega. La persona la puede cambiar
antes de confirmar, y corregir después (queda en la historia).

Sin feriados por ahora (decisión del usuario 2026-10-13): cuando uno cae en el
plazo, la fecha se ajusta a mano.
"""

from datetime import date, timedelta
from typing import Iterable, Optional, Tuple

from sqlmodel import Session

from ...models.crm import Cotizacion, EstadoCotizacion
from ...models.historia import TipoEvento
from .. import ajustes_negocio
from ..pricing import get_chile_time
from .historia import Actor, anotar

TALLER = "taller"
BODEGA = "bodega"
SE_CORRIGE = {EstadoCotizacion.CONFIRMADA}


class NoSeCambia(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


def hoy() -> date:
    """Hoy en Chile: a medianoche en Santiago ya es otro día, aunque en UTC no."""
    return get_chile_time().date()


def sumar_habiles(desde: date, dias: int) -> date:
    """`dias` días hábiles (lunes a viernes) después de `desde`."""
    fecha = desde
    while dias > 0:
        fecha += timedelta(days=1)
        if fecha.weekday() < 5:
            dias -= 1
    return fecha


def plazo(db: Session, caminos: Iterable[Optional[str]]) -> Tuple[int, str]:
    """(días hábiles, por qué): el del taller si algo va al taller; si no, el de bodega."""
    plazos = ajustes_negocio.leer(db, ajustes_negocio.PLAZOS_PEDIDO)
    por = TALLER if any(c == "TALLER" for c in caminos) else BODEGA
    return plazos[por], por


def propuesta(db: Session, caminos: Iterable[Optional[str]], desde: Optional[date] = None) -> Tuple[date, int, str]:
    """(fecha propuesta, días hábiles, por qué)."""
    dias, por = plazo(db, list(caminos))
    return sumar_habiles(desde or hoy(), dias), dias, por


def no_sirve(fecha: Optional[date]) -> Optional[str]:
    """Por qué esa fecha no se puede comprometer; None si se puede."""
    if fecha is None:
        return "Elige la fecha comprometida: para cuándo estará listo."
    if fecha < hoy():
        return "La fecha comprometida no puede ser anterior a hoy."
    return None


def cambiar(db: Session, cotizacion: Cotizacion, nueva: date, nota: Optional[str], actor: Actor) -> None:
    """Corrige la fecha de un pedido confirmado y lo anota. No hace commit."""
    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) not in SE_CORRIGE:
        raise NoSeCambia("La fecha se corrige mientras el pedido está confirmado.")
    motivo = no_sirve(nueva)
    if motivo:
        raise NoSeCambia(motivo)
    anterior = cotizacion.fecha_comprometida
    if anterior == nueva:
        return
    cotizacion.fecha_comprometida = nueva
    db.add(cotizacion)
    anotar(db, cotizacion, TipoEvento.FECHA, actor,
           de=anterior.isoformat() if anterior else None, a=nueva.isoformat(),
           nota=(nota or "").strip() or None)
