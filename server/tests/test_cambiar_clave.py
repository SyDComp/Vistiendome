"""
Cambiar la contraseña desde el panel (core/clave.py): pide la actual, exige un
largo mínimo, y con la nueva se entra y con la vieja ya no.
"""

from app.core import clave
from app.core.security import get_password_hash

RUTA = "/api/v1/auth/me/clave"
ACTUAL = "clave-de-hoy-123"
NUEVA = "clave-nueva-456"


def _con_clave(session, cuenta):
    cuenta.password_hash = get_password_hash(ACTUAL)
    session.add(cuenta)
    session.commit()


def _entra(client, password):
    return client.post("/api/v1/auth/login", json={"identificador": "admin@prueba.cl", "password": password}).status_code


def test_cambia_y_se_entra_con_la_nueva(client_admin, session, cuenta_admin):
    _con_clave(session, cuenta_admin)
    r = client_admin.put(RUTA, json={"actual": ACTUAL, "nueva": NUEVA})
    assert r.status_code == 200, r.text
    assert _entra(client_admin, NUEVA) == 200
    assert _entra(client_admin, ACTUAL) == 401


def test_sin_la_actual_correcta_no_cambia(client_admin, session, cuenta_admin):
    _con_clave(session, cuenta_admin)
    r = client_admin.put(RUTA, json={"actual": "otra-cosa-999", "nueva": NUEVA})
    assert r.status_code == 400
    assert "actual" in r.json()["detail"]
    assert _entra(client_admin, ACTUAL) == 200


def test_corta_o_igual_no_sirve(client_admin, session, cuenta_admin):
    _con_clave(session, cuenta_admin)
    corta = client_admin.put(RUTA, json={"actual": ACTUAL, "nueva": "abc"})
    assert corta.status_code == 400 and str(clave.LARGO_MINIMO) in corta.json()["detail"]
    igual = client_admin.put(RUTA, json={"actual": ACTUAL, "nueva": ACTUAL})
    assert igual.status_code == 400


def test_sin_sesion_no_se_puede(client):
    assert client.put(RUTA, json={"actual": ACTUAL, "nueva": NUEVA}).status_code == 401
