"""
¿Es la misma persona? Antes de pagar con un saldo a favor.

La clienta se identifica por su RUT, y el saldo a favor queda a nombre de ese
RUT. Pero por WhatsApp cualquiera puede decir un RUT: lo que el sistema puede
comparar es lo que se dio en cada pedido, el nombre y el teléfono, contra los
del pedido donde quedó el saldo.

No bloquea (un apodo o un número nuevo son comunes): si algo no coincide o no
se puede comparar, avisa, y para seguir hay que escribir una nota de cómo se
verificó. La nota queda en el pago y en la historia (decisión del usuario
2026-10-13).
"""

import re
from typing import List, NamedTuple, Optional

from sqlmodel import Session, select

from ...models.crm import Cotizacion
from ...models.pagos import Pago, TipoPago
from ..propuestas import normalizar


class Origen(NamedTuple):
    """Un pedido donde quedó saldo a favor de esta clienta."""
    pedido_numero: Optional[int]
    monto: int
    nombre: Optional[str]
    telefono: Optional[str]


def _nombre(cotizacion: Cotizacion) -> Optional[str]:
    if cotizacion.nombre_contacto:
        return cotizacion.nombre_contacto
    persona = cotizacion.persona
    return f"{persona.nombres} {persona.apellidos}".strip() if persona else None


def _digitos(telefono: Optional[str]) -> Optional[str]:
    """Los últimos 8 dígitos: "+56 9 8994 4444" y "989944444" son el mismo número."""
    solo = re.sub(r"\D", "", telefono or "")
    return solo[-8:] if len(solo) >= 8 else None


def origenes(db: Session, persona_id: str) -> List[Origen]:
    """Los pedidos donde esta clienta dejó saldo a favor (sin anulados), del más antiguo al más nuevo."""
    if not persona_id:
        return []
    filas = db.exec(
        select(Pago, Cotizacion)
        .join(Cotizacion, Pago.cotizacion_id == Cotizacion.id)
        .where(Cotizacion.persona_id == persona_id, Pago.tipo == TipoPago.A_FAVOR, Pago.anulado_en.is_(None))
        .order_by(Pago.registrado_en)
    ).all()
    return [Origen(c.numero, p.monto, _nombre(c), c.telefono_contacto) for p, c in filas]


def avisos(db: Session, cotizacion: Cotizacion) -> List[str]:
    """
    Lo que no calza entre este pedido y los pedidos de donde viene el saldo a
    favor. Vacío si todo coincide.
    """
    nombre = _nombre(cotizacion)
    telefono = _digitos(cotizacion.telefono_contacto)
    resultado = []
    for o in origenes(db, cotizacion.persona_id):
        if o.pedido_numero == cotizacion.numero:
            continue
        donde = f"el pedido N° {o.pedido_numero}"
        if not telefono or not _digitos(o.telefono):
            resultado.append(f"No se puede comparar el teléfono con {donde}: falta en alguno de los dos.")
        elif telefono != _digitos(o.telefono):
            resultado.append(f"El teléfono no es el mismo que el de {donde} ({o.telefono}).")
        if nombre and o.nombre and normalizar(nombre) != normalizar(o.nombre):
            resultado.append(f"El nombre no es el mismo que el de {donde} ({o.nombre}).")
    return resultado
