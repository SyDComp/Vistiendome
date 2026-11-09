"""
Dónde está una clienta: su comuna (y con eso su región), con o sin calle.

Antes la ubicación se guardaba solo si venía calle y número. Un despacho a
sucursal no la trae (la pone el transportista), así que el pedido decía
"San Nicolás, Región de Ñuble" y la clienta quedaba "No registrada"
(reportado por QA 2026-11-09). Lo mismo al crearla o editarla en el panel
sin escribir la calle.

Vale la más reciente: es donde está hoy.
"""

from typing import Optional

from sqlmodel import Session, select

from ..models.iam import Direccion, Persona


def _limpia(calle: Optional[str]) -> Optional[str]:
    return (calle or "").strip() or None


def actual(persona: Persona) -> Optional[Direccion]:
    return max(persona.direcciones or [], key=lambda d: d.created_at, default=None)


def registrar(db: Session, persona: Persona, comuna_id: Optional[int], calle: Optional[str] = None) -> None:
    """Desde un pedido: suma la ubicación si es nueva. Sin comuna no hay nada que guardar. No hace commit."""
    if persona is None or not comuna_id:
        return
    calle = _limpia(calle)
    en_la_comuna = db.exec(
        select(Direccion).where(Direccion.persona_id == persona.id, Direccion.comuna_id == comuna_id)
    ).all()
    # Sin calle, ya saber la comuna basta; con calle, esa misma calle.
    if any(calle is None or d.calle_y_numero == calle for d in en_la_comuna):
        return
    db.add(Direccion(persona_id=persona.id, comuna_id=comuna_id, calle_y_numero=calle))
    db.flush()


def corregir(db: Session, persona: Persona, comuna_id: Optional[int], calle: Optional[str] = None) -> None:
    """Desde la ficha de la clienta: cambia la ubicación de hoy (o la crea). No hace commit."""
    if not comuna_id:
        return
    vigente = actual(persona)
    if vigente is None:
        db.add(Direccion(persona_id=persona.id, comuna_id=comuna_id, calle_y_numero=_limpia(calle)))
        return
    vigente.comuna_id = comuna_id
    vigente.calle_y_numero = _limpia(calle)
    db.add(vigente)
