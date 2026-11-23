"""
La contraseña de una cuenta del panel: qué se acepta y cómo se cambia.

Antes no había cómo cambiarla desde el panel: solo con el script del servidor
(app/scripts/restablecer_acceso.py). Para entregar la tienda, quien la usa pone
su propia contraseña sin que nadie más la conozca (decisión del usuario
2026-11-21). El script sigue para quien la olvidó; los dos usan la misma regla.
"""

from typing import Optional

from . import security

LARGO_MINIMO = 8


class ClaveRechazada(Exception):
    """El mensaje dice por qué, para quien la está cambiando."""


def motivo_clave_nueva(nueva: str) -> Optional[str]:
    """None si sirve; si no, por qué."""
    if len(nueva or "") < LARGO_MINIMO:
        return f"La contraseña debe tener al menos {LARGO_MINIMO} caracteres."
    if not nueva.strip():
        return "La contraseña no puede ser solo espacios."
    return None


def cambiar(cuenta, actual: str, nueva: str) -> None:
    """Pide la actual: una sesión abierta en un PC ajeno no basta para cambiarla."""
    if not security.verify_password(actual or "", cuenta.password_hash):
        raise ClaveRechazada("La contraseña actual no es correcta.")
    motivo = motivo_clave_nueva(nueva)
    if motivo:
        raise ClaveRechazada(motivo)
    if nueva == actual:
        raise ClaveRechazada("La contraseña nueva tiene que ser distinta de la actual.")
    cuenta.password_hash = security.get_password_hash(nueva)
    cuenta.intentos_fallidos = 0
