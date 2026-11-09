"""
Dónde está una clienta: con saber su comuna basta. Un despacho a sucursal no
trae calle, y la clienta quedaba "No registrada" aunque el pedido dijera la comuna.
"""

import pytest
from sqlmodel import Session, select

from app.models.geo import Comuna, Region
from app.models.iam import Direccion, Persona

CLIENTES = "/api/v1/crm/clientes"


@pytest.fixture
def san_nicolas(session: Session):
    region = Region(nombre="Ñuble")
    session.add(region)
    session.commit()
    comuna = Comuna(nombre="San Nicolás", region_id=region.id)
    session.add(comuna)
    session.commit()
    return comuna


def _pedido(client, comuna, **extra):
    res = client.post("/api/v1/crm/", json={
        "rut": "11111111-1", "nombres": "Amanda", "origen": "CONTACTO_GRUPAL", "modo_entrega": "DESPACHO",
        "transporte": "STARKEN", "region": "Región de Ñuble", "comuna": comuna.nombre, "comuna_id": comuna.id,
        "items": [], **extra})
    assert res.status_code == 200, res.text


def _ficha(client_admin):
    [clienta] = [c for c in client_admin.get(CLIENTES).json() if c["nombres"] == "Amanda"]
    return clienta


def test_un_despacho_a_sucursal_deja_la_comuna_de_la_clienta(client, client_admin, san_nicolas):
    _pedido(client, san_nicolas, tipo_despacho="SUCURSAL")
    clienta = _ficha(client_admin)
    assert (clienta["comuna_nombre"], clienta["region_nombre"], clienta["direccion"]) == ("San Nicolás", "Ñuble", None)


def test_con_calle_la_guarda_y_no_repite_la_comuna(client, client_admin, session, san_nicolas):
    _pedido(client, san_nicolas, tipo_despacho="SUCURSAL")
    _pedido(client, san_nicolas, tipo_despacho="SUCURSAL")
    _pedido(client, san_nicolas, tipo_despacho="DOMICILIO", direccion="Los Aromos 12")
    persona = session.exec(select(Persona).where(Persona.nombres == "Amanda")).one()
    calles = sorted(str(d.calle_y_numero) for d in session.exec(select(Direccion).where(Direccion.persona_id == persona.id)))
    assert calles == ["Los Aromos 12", "None"]
    assert _ficha(client_admin)["direccion"] == "Los Aromos 12"   # la más reciente


def test_en_el_panel_basta_la_comuna(client_admin, san_nicolas):
    res = client_admin.post(CLIENTES, json={"rut": "22222222-2", "nombres": "Amanda", "apellidos": "",
                                            "comuna_id": san_nicolas.id, "direccion": ""})
    assert res.status_code == 200, res.text
    assert res.json()["comuna_nombre"] == "San Nicolás"
