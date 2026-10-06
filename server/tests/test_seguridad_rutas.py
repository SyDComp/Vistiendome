"""
El panel es privado. Lo público es solo lo que la tienda necesita.

POR QUÉ EXISTE
Crear un pedido era público —lo usan la tienda y el formulario de contacto— y
devolvía el pedido entero: bastaba mandar uno con el RUT de otra persona para
recibir su nombre, correo, teléfono y dirección. La misma ruta aceptaba pedidos
"manuales" desde fuera del panel. Y había un registro de cuentas abierto que
nadie usaba.

Nada de eso se veía, porque una ruta pública no avisa que lo es. Esta prueba
recorre TODAS las rutas: si aparece una pública que no está en la lista, falla.
Agregarla a la lista obliga a decidir, a propósito, que debe ser pública.
"""

from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.deps import RequirePermiso, get_current_user
from app.main import app
from app.models.crm import Cotizacion, OrigenCotizacion
from app.models.iam import Persona

# Lo que la tienda (o cualquiera, sin sesión) puede usar.
PUBLICAS = {
    ("GET", "/"),
    ("GET", "/health"),
    ("POST", "/api/v1/auth/login"),
    # Solo funciona mientras no exista ninguna cuenta: crea la primera.
    ("POST", "/api/v1/auth/bootstrap/first-admin"),
    ("POST", "/api/v1/analytics/track"),
    # Pedido de la tienda y del formulario de contacto. Devuelve solo el número.
    ("POST", "/api/v1/crm/"),
    ("POST", "/api/v1/propuestas/revisar"),
    ("GET", "/api/v1/collections/"),
    ("GET", "/api/v1/collections/{slug}"),
    ("GET", "/api/v1/geo/regiones"),
    ("GET", "/api/v1/geo/regiones/{region_id}/comunas"),
    ("GET", "/api/v1/homepage/"),
    ("GET", "/api/v1/homepage/help/sections"),
    ("GET", "/api/v1/media/srcsets"),
    ("GET", "/api/v1/products/"),
    ("GET", "/api/v1/products/categories/tree"),
    ("GET", "/api/v1/products/filters-metadata"),
    ("GET", "/api/v1/products/looks"),
    ("GET", "/api/v1/products/precios"),
    ("GET", "/api/v1/products/{id_or_slug}"),
    # Lo que se publica al sitio: redes, contacto. Lo privado del negocio no va acá.
    ("GET", "/api/v1/settings"),
    ("GET", "/api/v1/settings/{key}"),
}

# Con sesión pero sin permiso de administrador: el perfil propio.
SOLO_SESION = {
    ("GET", "/api/v1/auth/me"),
    ("PUT", "/api/v1/auth/me"),
}


def _depende_de(dependant, predicado) -> bool:
    return any(predicado(d.call) or _depende_de(d, predicado) for d in dependant.dependencies)


def _rutas():
    for ruta in app.routes:
        if isinstance(ruta, APIRoute):
            for metodo in ruta.methods:
                yield metodo, ruta.path, ruta


def test_ninguna_ruta_es_publica_sin_haberlo_decidido():
    publicas = {(m, p) for m, p, r in _rutas() if not _depende_de(r.dependant, lambda c: c is get_current_user)}
    sobran = publicas - PUBLICAS
    assert not sobran, f"Rutas públicas que no están en la lista: {sorted(sobran)}"


def test_con_sesion_hace_falta_ser_administrador():
    sin_permiso = {
        (m, p) for m, p, r in _rutas()
        if _depende_de(r.dependant, lambda c: c is get_current_user)
        and not _depende_de(r.dependant, lambda c: isinstance(c, RequirePermiso))
    }
    sobran = sin_permiso - SOLO_SESION
    assert not sobran, f"Rutas que piden sesión pero no permiso de administrador: {sorted(sobran)}"


def _pedido(**extra):
    return {"rut": "11111111-1", "nombres": "Ana", "apellidos": "Soto",
            "email_personal": "ana@correo.cl", "telefono": "+56911112222",
            "origen": "CATALOGO", "items": [], **extra}


def test_el_pedido_de_la_tienda_devuelve_solo_su_numero(client: TestClient):
    client.post("/api/v1/crm/", json=_pedido(direccion="Calle 1"))
    # Un segundo pedido con el mismo RUT: antes devolvía los datos guardados de esa persona.
    res = client.post("/api/v1/crm/", json=_pedido(nombres="Otra", email_personal=None))
    assert res.status_code == 200
    assert res.json() == {"numero": 2}


def test_la_tienda_no_crea_pedidos_manuales_ni_elige_a_la_persona(client: TestClient, session: Session):
    assert client.post("/api/v1/crm/", json=_pedido(origen="MANUAL")).status_code == 403
    assert client.post("/api/v1/crm/", json=_pedido(persona_id="01ABCDEF")).status_code == 403
    assert session.exec(select(Cotizacion)).all() == []


def test_el_panel_crea_pedidos_solo_con_sesion(client: TestClient, session: Session):
    assert client.post("/api/v1/crm/cotizaciones", json=_pedido()).status_code == 401
    assert session.exec(select(Cotizacion)).all() == []


def test_lo_que_crea_el_panel_es_manual(client_admin: TestClient, session: Session):
    res = client_admin.post("/api/v1/crm/cotizaciones", json=_pedido(origen="CATALOGO"))
    assert res.status_code == 200, res.text
    assert res.json()["origen"] == "MANUAL"
    assert session.exec(select(Cotizacion)).one().origen == OrigenCotizacion.MANUAL


def test_el_panel_puede_elegir_a_la_clienta_por_id(client_admin: TestClient, session: Session):
    persona = Persona(rut="22222222-2", nombres="Beatriz", apellidos="Lagos")
    session.add(persona)
    session.commit()
    res = client_admin.post("/api/v1/crm/cotizaciones", json=_pedido(rut=None, persona_id=persona.id))
    assert res.status_code == 200, res.text
    assert res.json()["persona_id"] == persona.id


def test_muchos_pedidos_seguidos_se_frenan(client: TestClient):
    respuestas = [client.post("/api/v1/crm/", json=_pedido()).status_code for _ in range(21)]
    assert respuestas[:20] == [200] * 20
    assert respuestas[20] == 429


def test_no_hay_registro_publico_de_cuentas(client: TestClient):
    res = client.post("/api/v1/auth/register", json={"rut": "1-9", "nombres": "x", "apellidos": "y",
                                                     "email": "x@y.cl", "password": "z"})
    assert res.status_code in (404, 405)
