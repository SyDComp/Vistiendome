"""
Por dónde pasa una pieza única, y nada más que eso.

    DISPONIBLE ──asignar a un pedido──▶ APARTADA ──sale el pedido──▶ VENDIDA
        ▲                                   │  ◀──deshacer el despacho──┘
        └──se quita o se cancela la prenda──┘
    DISPONIBLE ──dar de baja (con nota)──▶ BAJA
"""

from datetime import datetime, timezone
from typing import Optional

from ...models.piezas import EstadoPieza, PiezaUnica


class NoSePuede(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


def _pasar(pieza: PiezaUnica, desde: set, a: EstadoPieza, mensaje: str) -> None:
    if EstadoPieza(pieza.estado) not in desde:
        raise NoSePuede(mensaje)
    pieza.estado = a
    pieza.actualizada_en = datetime.now(timezone.utc)


def apartar(pieza: PiezaUnica) -> None:
    _pasar(pieza, {EstadoPieza.DISPONIBLE}, EstadoPieza.APARTADA,
           f"La pieza única N° {pieza.numero} no está disponible.")


def liberar(pieza: PiezaUnica) -> None:
    _pasar(pieza, {EstadoPieza.APARTADA}, EstadoPieza.DISPONIBLE,
           f"La pieza única N° {pieza.numero} no estaba apartada.")


def vender(pieza: PiezaUnica) -> None:
    _pasar(pieza, {EstadoPieza.APARTADA}, EstadoPieza.VENDIDA,
           f"La pieza única N° {pieza.numero} no estaba apartada para este pedido.")


def devolver(pieza: PiezaUnica) -> None:
    _pasar(pieza, {EstadoPieza.VENDIDA}, EstadoPieza.APARTADA,
           f"La pieza única N° {pieza.numero} no estaba vendida.")


def dar_de_baja(pieza: PiezaUnica, nota: Optional[str]) -> None:
    if not (nota or "").strip():
        raise NoSePuede("Escribe por qué se da de baja: queda anotado en la pieza.")
    _pasar(pieza, {EstadoPieza.DISPONIBLE}, EstadoPieza.BAJA,
           "Solo se da de baja una pieza disponible (no asignada a un pedido).")
    pieza.nota = nota.strip()
