"""
La historia del pedido: cada paso queda anotado con quién y cuándo.

Se prueba por las rutas, con una sesión de verdad (client_admin): lo que se
quiere verificar es que cada acción del panel deje su anotación, y que la
tienda quede como "Sitio web".
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.catalog import Category, Product, SKU
from app.models.crm import Cotizacion, CotizacionItem
from app.models.historia import PedidoEvento, TipoEvento


def _pedido(**extra):
    return {"rut": "11111111-1", "nombres": "Ana", "apellidos": "Soto", "items": [], **extra}


def _eventos(session: Session, numero: int):
    return session.exec(
        select(PedidoEvento).where(PedidoEvento.numero_pedido == numero)
        .order_by(PedidoEvento.ocurrido_at, PedidoEvento.id)
    ).all()


def _manual(client_admin: TestClient, **extra) -> dict:
    res = client_admin.post("/api/v1/crm/cotizaciones", json=_pedido(canal="WhatsApp", **extra))
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture
def variante(session: Session) -> SKU:
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    prod = Product(name="Vestido Noemi", slug="vestido-noemi", description="", category_id=cat.id)
    session.add(prod)
    session.commit()
    sku = SKU(product_id=prod.id, sku="NOE-M", price=17490, config={"TALLA": "M"})
    session.add(sku)
    session.commit()
    return sku


# --- Creación ----------------------------------------------------------------

def test_lo_que_llega_de_la_tienda_lo_creo_el_sitio_web(client: TestClient, session: Session):
    numero = client.post("/api/v1/crm/", json=_pedido(origen="CATALOGO", canal="Instagram")).json()["numero"]

    [creado] = _eventos(session, numero)
    assert creado.tipo == TipoEvento.CREADO
    assert creado.actor_nombre == "Sitio web" and creado.actor_cuenta_id is None
    assert creado.datos == {"origen": "CATALOGO", "canal": None}
    # La tienda no elige "¿Cómo llegó?": llegó por la web.
    assert session.exec(select(Cotizacion)).one().canal is None


def test_el_panel_anota_quien_lo_cargo_y_como_llego(client_admin: TestClient, session: Session, cuenta_admin):
    pedido = _manual(client_admin)

    [creado] = _eventos(session, pedido["numero"])
    assert creado.actor_cuenta_id == cuenta_admin.id
    assert creado.actor_nombre == "Admin Prueba"
    assert creado.datos == {"origen": "MANUAL", "canal": "WhatsApp"}
    assert pedido["canal"] == "WhatsApp"


def test_el_panel_no_crea_un_pedido_sin_decir_como_llego(client_admin: TestClient, session: Session):
    res = client_admin.post("/api/v1/crm/cotizaciones", json=_pedido(canal="  "))
    assert res.status_code == 422
    assert session.exec(select(Cotizacion)).all() == []


# --- Estado y canal ----------------------------------------------------------

def test_cada_cambio_de_estado_queda_con_su_antes_y_despues(client_admin: TestClient, session: Session):
    pedido = _manual(client_admin)
    url = f"/api/v1/crm/cotizaciones/{pedido['id']}/estado"
    client_admin.put(url, json={"estado": "EN_CONVERSACION"})
    client_admin.put(url, json={"estado": "EN_CONVERSACION"})  # sin cambio: no se anota
    client_admin.put(url, json={"estado": "CANCELADA"})

    estados = [(e.datos["de"], e.datos["a"]) for e in _eventos(session, pedido["numero"]) if e.tipo == TipoEvento.ESTADO]
    assert estados == [("NUEVA", "EN_CONVERSACION"), ("EN_CONVERSACION", "CANCELADA")]


def test_despachar_al_imprimir_etiquetas_lo_dice(client_admin: TestClient, session: Session):
    pedido = _manual(client_admin)
    client_admin.put(f"/api/v1/crm/cotizaciones/{pedido['id']}/estado",
                     json={"estado": "CONFIRMADA", "motivo": "etiquetas"})
    ultimo = _eventos(session, pedido["numero"])[-1]
    assert ultimo.datos["motivo"] == "etiquetas"


def test_corregir_como_llego_queda_anotado(client_admin: TestClient, session: Session):
    pedido = _manual(client_admin)
    res = client_admin.put(f"/api/v1/crm/cotizaciones/{pedido['id']}/canal", json={"canal": "Instagram"})
    assert res.status_code == 200

    ultimo = _eventos(session, pedido["numero"])[-1]
    assert (ultimo.tipo, ultimo.datos) == (TipoEvento.CANAL, {"de": "WhatsApp", "a": "Instagram"})
    assert session.get(Cotizacion, pedido["id"]).canal == "Instagram"


def test_lo_que_llego_por_la_web_no_cambia_de_canal(client_admin: TestClient, session: Session):
    numero = client_admin.post("/api/v1/crm/", json=_pedido(origen="CATALOGO")).json()["numero"]
    cot = session.exec(select(Cotizacion).where(Cotizacion.numero == numero)).one()
    res = client_admin.put(f"/api/v1/crm/cotizaciones/{cot.id}/canal", json={"canal": "WhatsApp"})
    assert res.status_code == 409


# --- Órdenes de corte --------------------------------------------------------

def test_la_orden_de_corte_se_anota_en_cada_pedido_de_sus_prendas(
    client_admin: TestClient, session: Session, variante: SKU
):
    a = _manual(client_admin, items=[{"sku_id": variante.id, "cantidad": 2}])
    b = _manual(client_admin, rut="22222222-2", items=[{"sku_id": variante.id, "cantidad": 1}])
    item_a = session.exec(select(CotizacionItem).where(CotizacionItem.cotizacion_id == a["id"])).one()
    item_b = session.exec(select(CotizacionItem).where(CotizacionItem.cotizacion_id == b["id"])).one()

    orden = client_admin.post("/api/v1/ordenes-corte/", json={"items": [
        {"sku_id": variante.id, "cantidad": 2, "cotizacion_item_id": item_a.id},
        {"sku_id": variante.id, "cantidad": 1, "cotizacion_item_id": item_b.id},
        {"sku_id": variante.id, "cantidad": 5},  # para stock: no es de ningún pedido
    ]}).json()
    client_admin.put(f"/api/v1/ordenes-corte/{orden['id']}/estado", json={"estado": "FINALIZADA"})

    tipos_a = [(e.tipo, e.datos) for e in _eventos(session, a["numero"])][1:]
    assert tipos_a == [
        (TipoEvento.ORDEN_AGREGADA, {"orden": orden["numero"], "prendas": 2}),
        (TipoEvento.ORDEN_ESTADO, {"orden": orden["numero"], "prendas": 2, "de": "PENDIENTE", "a": "FINALIZADA"}),
    ]
    assert [e.datos["prendas"] for e in _eventos(session, b["numero"])[1:]] == [1, 1]
    # Las 5 de stock no se anotaron en nadie.
    assert len(session.exec(select(PedidoEvento)).all()) == 2 + 2 + 2


def test_borrar_una_orden_queda_en_la_historia_de_sus_pedidos(
    client_admin: TestClient, session: Session, variante: SKU
):
    a = _manual(client_admin, items=[{"sku_id": variante.id, "cantidad": 1}])
    item = session.exec(select(CotizacionItem).where(CotizacionItem.cotizacion_id == a["id"])).one()
    orden = client_admin.post("/api/v1/ordenes-corte/", json={"items": [
        {"sku_id": variante.id, "cantidad": 1, "cotizacion_item_id": item.id}]}).json()
    client_admin.delete(f"/api/v1/ordenes-corte/{orden['id']}")

    ultimo = _eventos(session, a["numero"])[-1]
    assert (ultimo.tipo, ultimo.datos) == (TipoEvento.ORDEN_ELIMINADA, {"orden": orden["numero"], "prendas": 1})


# --- Borrar el pedido y la historia en sí ------------------------------------

def test_un_pedido_borrado_deja_su_historia(client_admin: TestClient, session: Session):
    pedido = _manual(client_admin)
    assert client_admin.delete(f"/api/v1/crm/cotizaciones/{pedido['id']}").status_code == 200

    tipos = [e.tipo for e in _eventos(session, pedido["numero"])]
    assert tipos == [TipoEvento.CREADO, TipoEvento.ELIMINADO]


def test_la_historia_se_lee_en_orden(client_admin: TestClient):
    pedido = _manual(client_admin)
    client_admin.put(f"/api/v1/crm/cotizaciones/{pedido['id']}/estado", json={"estado": "CONFIRMADA"})

    res = client_admin.get(f"/api/v1/crm/cotizaciones/{pedido['id']}/historia")
    assert res.status_code == 200
    assert [e["tipo"] for e in res.json()] == ["CREADO", "ESTADO"]
    assert res.json()[0]["actor_nombre"] == "Admin Prueba"


def test_la_historia_no_se_edita_ni_se_borra(client_admin: TestClient, session: Session):
    pedido = _manual(client_admin)
    [evento] = _eventos(session, pedido["numero"])

    evento.actor_nombre = "Otra persona"
    session.add(evento)
    with pytest.raises(ValueError):
        session.commit()
    session.rollback()

    session.delete(session.get(PedidoEvento, evento.id))
    with pytest.raises(ValueError):
        session.commit()
    session.rollback()


# --- Ajustes del negocio -----------------------------------------------------

def test_los_canales_parten_con_valores_por_defecto(client_admin: TestClient):
    canales = client_admin.get("/api/v1/ajustes-negocio").json()["canales_pedido"]
    assert canales[0] == "WhatsApp" and "En la tienda" in canales


def test_los_canales_se_editan_y_se_limpian(client_admin: TestClient):
    res = client_admin.put("/api/v1/ajustes-negocio/canales_pedido", json={"valor": [" WhatsApp ", "", "Feria"]})
    assert res.json() == {"valor": ["WhatsApp", "Feria"]}
    assert client_admin.get("/api/v1/ajustes-negocio").json()["canales_pedido"] == ["WhatsApp", "Feria"]


@pytest.mark.parametrize("valor", [["WhatsApp", "whatsapp"], [], ["  "], "WhatsApp"])
def test_los_canales_no_aceptan_repetidos_ni_lista_vacia(client_admin: TestClient, valor):
    res = client_admin.put("/api/v1/ajustes-negocio/canales_pedido", json={"valor": valor})
    assert res.status_code == 422


def test_un_ajuste_que_no_existe_no_se_crea(client_admin: TestClient):
    assert client_admin.put("/api/v1/ajustes-negocio/inventado", json={"valor": 1}).status_code == 404
