"""
Las prendas a medida (de un pedido, de una orden de corte, una pieza única)
apuntan a sus características y opciones por identidad. Renombrar se ve en
todas, y lo que no existe en el catálogo es propuesta, no un texto suelto.
"""

from sqlmodel import select

from app.models.crm import Cotizacion, CotizacionItem
from tests.apoyo_catalogo import en_biblioteca

ATRIBUTOS = "/api/v1/admin/catalog/attributes"


def _pedido(client_admin, session, prendas):
    res = client_admin.post("/api/v1/crm/cotizaciones", json={
        "rut": "11111111-1", "nombres": "Ana", "canal": "WhatsApp", "items": prendas})
    return res


def _cuello(client_admin):
    return client_admin.post(ATRIBUTOS, json={"name": "cuello", "domain": [{"value": "en v"}, {"value": "redondo"}]}).json()


def test_renombrar_una_caracteristica_se_ve_en_la_prenda_del_pedido(client_admin, session):
    en_biblioteca(session, {"TALLA": ["M"]})
    session.commit()
    cuello = _cuello(client_admin)
    res = _pedido(client_admin, session, [{"nombre_custom": "Tapado", "config_custom": {"TALLA": "M", "CUELLO": "Redondo"},
                                           "config_propuesta": {"CUELLO": "Bote"}}])
    assert res.status_code == 200, res.text

    client_admin.put(f"{ATRIBUTOS}/{cuello['id']}", json={**cuello, "name": "escote"})

    [item] = session.exec(select(CotizacionItem)).all()
    session.refresh(item)
    # Lo propuesto reemplaza a lo elegido en la misma característica, y las dos dicen ESCOTE.
    assert item.config_custom == {"TALLA": "M"}
    assert item.config_propuesta == {"ESCOTE": "Bote"}
    leido = client_admin.get(f"/api/v1/crm/cotizaciones/{res.json()['id']}").json()["items"][0]
    assert leido["config"] == {"TALLA": "M"} and leido["config_propuesta"] == {"ESCOTE": "Bote"}


def test_lo_elegido_que_no_existe_queda_como_propuesta(client_admin, session):
    en_biblioteca(session, {"COLOR": ["Negro"]})
    session.commit()
    _pedido(client_admin, session, [{"nombre_custom": "Tapado", "config_custom": {"COLOR": "Fucsia Neón"}}])
    [item] = session.exec(select(CotizacionItem)).all()
    assert item.config_custom is None
    assert item.config_propuesta == {"COLOR": "Fucsia Neón"}


def test_una_caracteristica_que_no_existe_se_rechaza(client_admin, session):
    res = _pedido(client_admin, session, [{"nombre_custom": "Tapado", "config_custom": {"CUELLO": "Redondo"}}])
    assert res.status_code == 422 and "CUELLO" in res.text and "Recarga" in res.text
    assert session.exec(select(Cotizacion)).all() == []


def test_no_se_quita_una_opcion_que_usa_una_prenda(client_admin, session):
    cuello = _cuello(client_admin)
    _pedido(client_admin, session, [{"nombre_custom": "Tapado", "config_custom": {"CUELLO": "Redondo"}}])
    sin_redondo = [o for o in cuello["domain"] if o["value"] != "Redondo"]
    res = client_admin.put(f"{ATRIBUTOS}/{cuello['id']}", json={**cuello, "domain": sin_redondo})
    assert res.status_code == 400 and "prenda" in res.text


def test_no_se_borra_una_caracteristica_que_usa_una_propuesta(client_admin, session):
    cuello = _cuello(client_admin)
    _pedido(client_admin, session, [{"nombre_custom": "Tapado", "config_propuesta": {"CUELLO": "Bote"}}])
    res = client_admin.delete(f"{ATRIBUTOS}/{cuello['id']}")
    assert res.status_code == 400 and "propuesta" in res.text
