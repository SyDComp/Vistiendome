"""
Restablece la contraseña de una cuenta del panel.

Para cuando alguien olvida su contraseña o queda bloqueado por intentos
fallidos. Lista las cuentas, pide elegir una y una contraseña nueva, que se
escribe dos veces y no se muestra en pantalla. También deja en cero los
intentos fallidos.

Uso, en el servidor:

    docker exec -it vistiendome_backend_prod python -m app.scripts.restablecer_acceso
"""
import sys
from getpass import getpass
from typing import List, Optional

from sqlmodel import Session, select

from app.core import security
from app.database import engine
from app.models.iam import CuentaAcceso

LARGO_MINIMO = 6


def _mostrar(cuentas: List[CuentaAcceso]) -> None:
    for i, c in enumerate(cuentas, start=1):
        nombre = f"{c.persona.nombres} {c.persona.apellidos}".strip()
        apodo = f" | apodo: {c.apodo}" if c.apodo else ""
        print(f"  [{i}] {nombre} | {c.email_corporativo}{apodo}")


def _elegir(cuentas: List[CuentaAcceso]) -> Optional[CuentaAcceso]:
    opcion = input("\nNúmero de la cuenta (ENTER para salir): ").strip()
    if not opcion:
        return None
    if not opcion.isdigit() or not 1 <= int(opcion) <= len(cuentas):
        sys.exit("Opción no válida.")
    return cuentas[int(opcion) - 1]


def _pedir_clave() -> str:
    clave = getpass(f"Contraseña nueva (mínimo {LARGO_MINIMO} caracteres): ")
    if len(clave) < LARGO_MINIMO:
        sys.exit(f"La contraseña debe tener al menos {LARGO_MINIMO} caracteres.")
    if getpass("Repítela: ") != clave:
        sys.exit("Las contraseñas no coinciden. No se cambió nada.")
    return clave


def restablecer() -> None:
    with Session(engine) as sesion:
        cuentas = sesion.exec(select(CuentaAcceso).order_by(CuentaAcceso.created_at)).all()
        if not cuentas:
            sys.exit("No hay cuentas. La primera se crea desde /admin/bootstrap.")
        print("Cuentas del panel:")
        _mostrar(cuentas)
        cuenta = _elegir(cuentas)
        if cuenta is None:
            return
        cuenta.password_hash = security.get_password_hash(_pedir_clave())
        cuenta.intentos_fallidos = 0
        sesion.add(cuenta)
        sesion.commit()
        print(f"\nListo. Ya se puede entrar con {cuenta.apodo or cuenta.email_corporativo} y la contraseña nueva.")


if __name__ == "__main__":
    restablecer()
