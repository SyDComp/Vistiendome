"""
El destino de un pedido se corrige mientras no sale, y la etiqueta lo toma de
ahí. Al editar a la clienta, sus pedidos por despachar pueden tomar su ubicación.
"""

import pytest
from sqlmodel import Session, select

from app.models.crm import Cotizacion, EstadoCotizacion
from app.models.geo import Comuna, Region
from app.models.historia import PedidoEvento, TipoEvento

CRM = "/api/v1/crm"


@pytest.fixture
def lugares(session: Session):
    nuble, biobio = Region(nombre="Ñuble"), Region(nombre="Biobío")
    session.add_all([nuble, biobio])
    session.commit()
    san_nicolas = Comuna(nombre="San Nicolás", region_id=nuble.id)
    lebu = Comuna(nombre="Lebu", region_id=biobio.id)
    session.add_all([san_nicolas, lebu])
    session.commit()
    return {"san_nicolas": san_nicolas, "lebu": lebu}


def _pedido(client, session, **destino) -> Cotizacion:
    res = client.post(f"{CRM}/", json={"rut": "11111111-1", "nombres": "Azul", "origen": "CONTACTO_INDIVIDUAL",
                                       "items": [], **destino})
    assert res.status_code == 200, res.text
    return session.exec(select(Cotizacion).where(Cotizacion.numero == res.json()["numero"])).one()


def test_se_corrige_el_destino_y_queda_en_la_historia(client, client_admin, session, lugares):
    cot = _pedido(client, session, modo_entrega="DESPACHO", tipo_despacho="DOMICILIO", transporte="STARKEN",
                  region="Biobío", direccion="Calle 789")
    res = client_admin.put(f"{CRM}/cotizaciones/{cot.id}/destino", json={
        "modo_entrega": "DESPACHO", "tipo_despacho": "DOMICILIO", "transporte": "STARKEN",
        "region": "Ñuble", "comuna": "San Nicolás", "comuna_id": lugares["san_nicolas"].id, "direccion": "Los Aromos 12"})
    assert res.status_code == 200, res.text
    assert (res.json()["region"], res.json()["comuna"], res.json()["direccion"]) == ("Ñuble", "San Nicolás", "Los Aromos 12")
    [evento] = session.exec(select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.DESTINO)).all()
    assert "Los Aromos 12" in evento.datos["a"] and "Calle 789" in evento.datos["de"]


def test_a_domicilio_sin_direccion_no_se_puede_y_despachado_tampoco(client, client_admin, session, lugares):
    cot = _pedido(client, session, modo_entrega="RETIRO")
    res = client_admin.put(f"{CRM}/cotizaciones/{cot.id}/destino", json={
        "modo_entrega": "DESPACHO", "tipo_despacho": "DOMICILIO", "region": "Ñuble", "comuna": "San Nicolás"})
    assert res.status_code == 409 and "la dirección" in res.json()["detail"]

    cot.estado = EstadoCotizacion.DESPACHADA
    session.add(cot)
    session.commit()
    res = client_admin.put(f"{CRM}/cotizaciones/{cot.id}/destino", json={"modo_entrega": "RETIRO"})
    assert res.status_code == 409


def test_la_ubicacion_de_la_clienta_pasa_a_sus_pedidos_por_despachar(client, client_admin, session, lugares):
    a_sucursal = _pedido(client, session, modo_entrega="DESPACHO", tipo_despacho="SUCURSAL", transporte="STARKEN",
                         region="Biobío", comuna="Lebu", comuna_id=lugares["lebu"].id)
    retiro = _pedido(client, session, modo_entrega="RETIRO")
    persona_id = a_sucursal.persona_id

    assert [p["numero"] for p in client_admin.get(f"{CRM}/clientes/{persona_id}/por-despachar").json()] == [a_sucursal.numero]

    res = client_admin.put(f"{CRM}/clientes/{persona_id}", json={
        "rut": "11111111-1", "nombres": "Azul", "apellidos": "", "comuna_id": lugares["san_nicolas"].id,
        "direccion": "Los Aromos 12", "transporte_preferido": "CORREOS DE CHILE"})
    assert res.status_code == 200, res.text
    res = client_admin.post(f"{CRM}/clientes/{persona_id}/destino-a-pedidos")
    assert res.status_code == 200, res.text
    assert res.json() == {"cambiados": [a_sucursal.numero], "omitidos": []}

    session.expire_all()
    cambiado = session.get(Cotizacion, a_sucursal.id)
    assert (cambiado.comuna, cambiado.region, cambiado.direccion, cambiado.transporte, str(cambiado.tipo_despacho.value)) == \
        ("San Nicolás", "Ñuble", "Los Aromos 12", "CORREOS DE CHILE", "DOMICILIO")
    assert session.get(Cotizacion, retiro.id).comuna is None
