"""
Por dónde puede pasar un pedido, y qué se deshace al volver atrás.

    NUEVA ⇄ EN CONVERSACIÓN ──Confirmar──▶ CONFIRMADA ⇄ DESPACHADA
       └──────────┴──▶ CANCELADA ◀──────────────┘

  · A CONFIRMADA se llega solo por «Confirmar pedido» (ahí se decide de dónde
    sale cada prenda), o deshaciendo un despacho.
  · A DESPACHADA, solo desde CONFIRMADA.
  · Un pedido DESPACHADO ya salió: solo se puede deshacer el despacho.
  · Volver a NUEVA o EN CONVERSACIÓN borra los caminos: las prendas de bodega
    quedan libres para otros, y al confirmar de nuevo se vuelve a proponer.
    Lo hecho en el taller no se pierde: sigue marcado en sus prendas.
"""

from typing import Optional

from ....models.crm import Cotizacion, EstadoCotizacion as E
from ..prendas import activas

_PERMITIDOS = {
    E.NUEVA: {E.EN_CONVERSACION, E.CANCELADA},
    E.EN_CONVERSACION: {E.NUEVA, E.CANCELADA},
    E.CONFIRMADA: {E.NUEVA, E.EN_CONVERSACION, E.DESPACHADA, E.CANCELADA},
    E.DESPACHADA: {E.CONFIRMADA},
    E.CANCELADA: {E.NUEVA, E.EN_CONVERSACION},
}

_SIN_CONFIRMAR = {E.NUEVA, E.EN_CONVERSACION}


def por_que_no(de: E, a: E) -> Optional[str]:
    """Por qué no se puede pasar de `de` a `a` con un cambio de estado simple; None si se puede."""
    de, a = E(de), E(a)
    if de == a or a in _PERMITIDOS.get(de, set()):
        return None
    if a == E.CONFIRMADA:
        return "Para confirmar usa «Confirmar pedido»: ahí se decide de dónde sale cada prenda."
    if de == E.DESPACHADA:
        return "Este pedido ya salió. Primero deshaz el despacho (vuelve a Confirmada)."
    if a == E.DESPACHADA:
        return "Solo se despacha un pedido confirmado."
    return "Ese cambio de estado no se puede hacer."


def al_cambiar(cotizacion: Cotizacion, a: E) -> None:
    """Lo que el cambio a `a` deshace en el pedido. No hace commit."""
    if E(a) in _SIN_CONFIRMAR:
        cotizacion.confirmada_en = None
        for item in activas(cotizacion):
            item.camino = None
