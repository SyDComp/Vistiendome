"""Quién hizo algo: una cuenta del panel, o el sitio web."""

from typing import NamedTuple, Optional

from ....models.iam import CuentaAcceso


class Actor(NamedTuple):
    cuenta_id: Optional[str]
    nombre: str


SITIO_WEB = Actor(None, "Sitio web")


def de_cuenta(cuenta: CuentaAcceso) -> Actor:
    """El apodo si tiene; si no, su nombre. Se guarda tal cual estaba ese día."""
    if cuenta.apodo:
        nombre = cuenta.apodo
    else:
        persona = cuenta.persona
        nombre = f"{persona.nombres} {persona.apellidos}".strip() if persona else ""
    return Actor(cuenta.id, nombre or cuenta.email_corporativo)
