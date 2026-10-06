"""
Quien es el cliente lo decide el RUT. Solo el RUT.

EL PROBLEMA
`crear_cotizacion` buscaba una Persona existente por RUT, y si no habia RUT o
no calzaba, seguia buscando por email y despues por telefono. Dos personas
DISTINTAS que comparten un telefono -pareja, familia, el telefono del local- o
un correo terminaban fusionadas bajo el mismo cliente.

Y al reves: si el mismo RUT volvia con un nombre de verdad distinto -no solo
mayusculas, minusculas o tildes-, el nombre nuevo se perdia sin dejar rastro:
la Persona ya existente conservaba su nombre viejo, y ese era el unico que se
mostraba despues en la lista de pedidos y en la orden de corte.

Estas pruebas cubren las dos direcciones del arreglo.
"""

from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.models.crm import Cotizacion
from app.models.iam import Persona


def _cotizar(client: TestClient, session: Session, **overrides):
    """Un pedido desde la tienda. La ruta devuelve solo el número: el resto se lee de la base."""
    payload = {
        "rut": None,
        "nombres": "Cliente",
        "apellidos": "",
        "email_personal": None,
        "telefono": None,
        "origen": "CATALOGO",
        "items": [],
    }
    payload.update(overrides)
    res = client.post("/api/v1/crm/", json=payload)
    assert res.status_code == 200, res.text
    return session.exec(select(Cotizacion).where(Cotizacion.numero == res.json()["numero"])).one()


def test_mismo_email_rut_distinto_son_personas_distintas(client: TestClient, session: Session):
    """El correo (o el telefono) no decide identidad: solo el RUT."""
    _cotizar(client, session, rut="11111111-1", nombres="Ana", apellidos="Soto",
             email_personal="compartido@correo.cl")
    _cotizar(client, session, rut="22222222-2", nombres="Beatriz", apellidos="Lagos",
             email_personal="compartido@correo.cl")

    personas = session.exec(select(Persona)).all()
    assert len(personas) == 2, "el mismo correo fusiono a dos clientes distintos"


def test_mismo_telefono_rut_distinto_son_personas_distintas(client: TestClient, session: Session):
    _cotizar(client, session, rut="33333333-3", nombres="Carla", apellidos="Diaz",
             telefono="+56911112222")
    _cotizar(client, session, rut="44444444-4", nombres="Diana", apellidos="Rojas",
             telefono="+56911112222")

    personas = session.exec(select(Persona)).all()
    assert len(personas) == 2, "el mismo telefono fusiono a dos clientes distintos"


def test_mismo_rut_mismo_nombre_sin_tildes_ni_mayusculas_es_el_mismo_cliente(client: TestClient, session: Session):
    """"Maria Jose" y "MARIA JOSÉ" son la misma persona escribiendo distinto."""
    _cotizar(client, session, rut="55555555-5", nombres="Maria Jose", apellidos="Perez")
    _cotizar(client, session, rut="55555555-5", nombres="MARIA JOSÉ", apellidos="PEREZ")

    personas = session.exec(select(Persona).where(Persona.rut == "55555555-5")).all()
    assert len(personas) == 1, "el mismo rut con el mismo nombre (distinta grafia) no debe duplicar la Persona"


def test_mismo_rut_nombre_distinto_no_pisa_el_nombre_de_la_persona(client: TestClient, session: Session):
    """
    Un RUT compartido (o tecleado por error) no debe hacer que el pedido
    nuevo se atribuya silenciosamente al nombre de otra persona, ni que el
    nombre real de esta compra se pierda.
    """
    primera = _cotizar(client, session, rut="66666666-6", nombres="Elena", apellidos="Vidal")
    segunda = _cotizar(client, session, rut="66666666-6", nombres="Marcos", apellidos="Contreras")

    personas = session.exec(select(Persona).where(Persona.rut == "66666666-6")).all()
    assert len(personas) == 1, "el rut sigue siendo unico: se vincula a la misma Persona"
    assert personas[0].nombres == "Elena", "el nombre guardado de la Persona no se pisa con uno distinto"

    assert primera.nombre_contacto == "Elena Vidal"
    assert segunda.nombre_contacto == "Marcos Contreras", \
        "el nombre real de ESTE pedido debe quedar en la cotizacion, aunque la Persona conserve el suyo"
