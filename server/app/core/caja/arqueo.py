"""
El arqueo del cajón: con cuánto partió, cuánto debería haber y cuánto había.

    Debería haber = fondo con que partió + efectivo del día (cobrado - devuelto)
    Diferencia    = contado - debería haber      (positiva: sobra; negativa: falta)

Antes el cierre decía solo el efectivo del día, y eso no cuadra con el cajón:
nadie sabía con cuánto había partido (reportado por QA 2026-11-20; decisión del
usuario: fondo al abrir, contado al cerrar, lo que se deja para mañana).

Si el día no tiene fondo anotado, se propone lo que se dejó al cerrar el último
día anterior (o lo que se contó, si no se dijo cuánto se dejaba).
"""

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from ...models.caja import ArqueoCaja
from ..pedidos.historia import Actor


class NoSeAnota(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


@dataclass
class Arqueo:
    fecha: date
    fondo_inicial: Optional[int]
    fondo_propuesto: Optional[int]      # si no se anotó: lo que quedó el día anterior
    abierto_por: Optional[str]
    contado: Optional[int]
    deja: Optional[int]
    nota: Optional[str]
    cerrado_por: Optional[str]
    cerrado_en: Optional[datetime]
    deberia: Optional[int]              # fondo + efectivo del día (None sin fondo)
    diferencia: Optional[int]           # contado - debería (None si falta alguno)


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


def _monto(valor: Optional[int], que: str) -> Optional[int]:
    if valor is None:
        return None
    if valor < 0:
        raise NoSeAnota(f"{que} no puede ser negativo.")
    return int(valor)


def _propuesto(db: Session, dia: date) -> Optional[int]:
    anterior = db.exec(
        select(ArqueoCaja).where(ArqueoCaja.fecha < dia, (ArqueoCaja.deja != None) | (ArqueoCaja.contado != None))  # noqa: E711
        .order_by(ArqueoCaja.fecha.desc())
    ).first()
    if anterior is None:
        return None
    return anterior.deja if anterior.deja is not None else anterior.contado


def del_dia(db: Session, dia: date, efectivo_del_dia: Optional[int]) -> Arqueo:
    a = db.get(ArqueoCaja, dia) or ArqueoCaja(fecha=dia)
    fondo = a.fondo_inicial
    deberia = None if fondo is None else fondo + (efectivo_del_dia or 0)
    return Arqueo(
        fecha=dia, fondo_inicial=fondo, fondo_propuesto=_propuesto(db, dia) if fondo is None else None,
        abierto_por=a.abierto_por, contado=a.contado, deja=a.deja, nota=a.nota,
        cerrado_por=a.cerrado_por, cerrado_en=a.cerrado_en, deberia=deberia,
        diferencia=None if deberia is None or a.contado is None else a.contado - deberia,
    )


def anotar_fondo(db: Session, dia: date, monto: int, actor: Actor) -> None:
    """Con cuánto partió el cajón ese día. Se puede corregir. No hace commit."""
    a = db.get(ArqueoCaja, dia) or ArqueoCaja(fecha=dia)
    a.fondo_inicial = _monto(monto, "El fondo")
    a.abierto_por_id, a.abierto_por, a.abierto_en = actor.cuenta_id, actor.nombre, _ahora()
    db.add(a)


def cerrar(db: Session, dia: date, contado: int, deja: Optional[int], nota: Optional[str], actor: Actor) -> None:
    """Lo contado al cerrar y lo que se deja para mañana (si no se dice, todo lo contado). No hace commit."""
    a = db.get(ArqueoCaja, dia) or ArqueoCaja(fecha=dia)
    if a.fondo_inicial is None:
        raise NoSeAnota("Primero anota con cuánto partió el cajón ese día.")
    a.contado = _monto(contado, "Lo contado")
    a.deja = _monto(deja, "Lo que se deja") if deja is not None else a.contado
    if a.deja > a.contado:
        raise NoSeAnota("No se puede dejar más de lo que se contó.")
    a.nota = (nota or "").strip() or None
    a.cerrado_por_id, a.cerrado_por, a.cerrado_en = actor.cuenta_id, actor.nombre, _ahora()
    db.add(a)
