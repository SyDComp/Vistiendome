"""Leer y guardar ajustes del negocio. Sin fila guardada, vale el valor por defecto."""

from datetime import datetime, timezone
from typing import Any, Dict

from sqlmodel import Session

from ...models.ajustes import AjusteNegocio
from .registro import AJUSTES


def leer(db: Session, clave: str) -> Any:
    fila = db.get(AjusteNegocio, clave)
    return fila.valor if fila is not None else AJUSTES[clave].defecto


def leer_todos(db: Session) -> Dict[str, Any]:
    return {clave: leer(db, clave) for clave in AJUSTES}


def guardar(db: Session, clave: str, valor: Any) -> Any:
    """Valida y guarda. KeyError si la clave no existe; ValueError si el valor no sirve."""
    limpio = AJUSTES[clave].validar(valor)
    fila = db.get(AjusteNegocio, clave)
    if fila is None:
        fila = AjusteNegocio(clave=clave)
    fila.valor = limpio
    fila.actualizado_at = datetime.now(timezone.utc)
    db.add(fila)
    db.commit()
    return limpio
