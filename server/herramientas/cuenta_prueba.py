"""
Una cuenta de administración para probar en local (la caja, el panel).

Solo contra la base local: si DATABASE_URL no apunta a esta máquina, no hace
nada. Si la cuenta ya existe, le deja esta clave y el permiso de administrar.

    cd server
    DATABASE_URL=<la del .env, con la base vistiendome_prueba> ./venv/Scripts/python.exe -m herramientas.cuenta_prueba

(La base de pruebas la levanta herramientas/servidor_prueba.py.)

Entra con el apodo y la clave de abajo. No es una cuenta de nadie: se crea
para probar y se puede borrar cuando se quiera.
"""

from urllib.parse import urlparse

from sqlmodel import Session, select

# Primero la base: es la que carga el .env (security lo necesita al importarse).
from app.database import DATABASE_URL, engine
from app.core.security import get_password_hash
from app.models.iam import CuentaAcceso, EstadoCuenta, Permiso, Persona, UsuarioPermisosDirectos

APODO = "prueba"
EMAIL = "prueba@vistiendome.test"
CLAVE = "prueba-local-2026"
RUT = "11111111-1"

LOCALES = {"localhost", "127.0.0.1", "::1"}


def _una(db: Session, modelo, **donde):
    fila = db.exec(select(modelo).filter_by(**donde)).first()
    if fila is None:
        fila = modelo(**donde)
        db.add(fila)
        db.flush()
    return fila


def crear() -> None:
    host = urlparse(DATABASE_URL.replace("+psycopg", "")).hostname
    if host not in LOCALES:
        raise SystemExit(f"La base no es local ({host}): no se crea nada.")
    with Session(engine) as db:
        estado = _una(db, EstadoCuenta, nombre="ACTIVO")
        permiso = _una(db, Permiso, recurso="SISTEMA", accion="ADMINISTRAR")
        cuenta = db.exec(select(CuentaAcceso).where(CuentaAcceso.apodo == APODO)).first()
        if cuenta is None:
            persona = db.exec(select(Persona).where(Persona.rut == RUT)).first() \
                or Persona(rut=RUT, nombres="Cuenta", apellidos="de prueba")
            db.add(persona)
            db.flush()
            cuenta = CuentaAcceso(persona_id=persona.id, email_corporativo=EMAIL, apodo=APODO,
                                  password_hash="-", estado_id=estado.id)
        cuenta.password_hash = get_password_hash(CLAVE)
        cuenta.estado_id = estado.id
        cuenta.intentos_fallidos = 0
        db.add(cuenta)
        db.flush()
        _una(db, UsuarioPermisosDirectos, cuenta_id=cuenta.id, permiso_id=permiso.id)
        db.commit()
    print(f"Cuenta de prueba lista: entra con «{APODO}» (base local {host}).")


if __name__ == "__main__":
    crear()
