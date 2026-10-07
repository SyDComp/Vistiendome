"""
Qué prenda es cada una, su precio en tres estados, y el retiro sin datos de despacho.

Se prueba por las rutas: la tienda (sin sesión) y el panel (con sesión).
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.catalog import Category, Product, SKU
from app.models.crm import Cotizacion, CotizacionItem
from app.models.historia import PedidoEvento, TipoEvento
from app.models.iam import Direccion


@pytest.fixture
def noemi(session: Session) -> Product:
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    prod = Product(name="Vestido Noemi", slug="vestido-noemi", description="", category_id=cat.id)
    session.add(prod)
    session.commit()
    session.add_all([
        SKU(product_id=prod.id, sku="NOE-CORAL-M", price=17490, config={"COLOR": "Coral", "TALLA": "M"}),
        SKU(product_id=prod.id, sku="NOE-CORAL-L", price=17490, config={"COLOR": "Coral", "TALLA": "L"}),
    ])
    session.commit()
    session.refresh(prod)
    return prod


def _contacto(client: TestClient, session: Session, prendas, **extra) -> Cotizacion:
    payload = {"rut": "11111111-1", "nombres": "Ana", "origen": "CONTACTO_INDIVIDUAL",
               "modo_entrega": "DESPACHO", "items": prendas, **extra}
    res = client.post("/api/v1/crm/", json=payload)
    assert res.status_code == 200, res.text
    return session.exec(select(Cotizacion).where(Cotizacion.numero == res.json()["numero"])).one()


def _items(session: Session, cot: Cotizacion):
    return session.exec(select(CotizacionItem).where(CotizacionItem.cotizacion_id == cot.id)).all()


# --- Qué prenda es -----------------------------------------------------------

def test_lo_elegido_que_coincide_exacto_es_esa_variante_con_su_precio(client, session, noemi):
    cot = _contacto(client, session, [{"producto_id": noemi.id, "nombre_custom": "Vestido Noemi",
                                       "config_custom": {"TALLA": "M", "COLOR": "Coral"}, "precio_unitario_estimado": 0}])
    [item] = _items(session, cot)
    assert item.sku.sku == "NOE-CORAL-M"
    assert item.producto_id == noemi.id
    assert item.precio_unitario_estimado == 17490
    assert item.nombre_custom is None and item.config_custom is None


def test_con_algo_propuesto_es_personalizada_de_ese_producto(client, session, noemi):
    cot = _contacto(client, session, [{"producto_id": noemi.id, "nombre_custom": "Vestido Noemi",
                                       "config_custom": {"TALLA": "M", "COLOR": "Coral"},
                                       "config_propuesta": {"MANGAS": "Corta"}}])
    [item] = _items(session, cot)
    assert item.sku_id is None and item.producto_id == noemi.id
    assert item.precio_unitario_estimado is None  # por cotizar
    assert item.config_propuesta == {"MANGAS": "Corta"}


def test_una_caracteristica_de_mas_no_es_la_variante(client, session, noemi):
    cot = _contacto(client, session, [{"producto_id": noemi.id, "nombre_custom": "Vestido Noemi",
                                       "config_custom": {"TALLA": "M", "COLOR": "Coral", "LARGO": "Maxi"}}])
    [item] = _items(session, cot)
    assert item.sku_id is None and item.producto_id == noemi.id


def test_una_variante_dada_de_baja_no_se_elige(client, session, noemi):
    baja = next(s for s in noemi.skus if s.sku == "NOE-CORAL-M")
    baja.is_deleted = True
    session.add(baja)
    session.commit()
    cot = _contacto(client, session, [{"producto_id": noemi.id, "config_custom": {"TALLA": "M", "COLOR": "Coral"}}])
    [item] = _items(session, cot)
    assert item.sku_id is None and item.producto_id == noemi.id


def test_lo_escrito_a_mano_no_tiene_producto_y_esta_por_cotizar(client, session):
    cot = _contacto(client, session, [{"nombre_custom": "Bolero tejido", "precio_unitario_estimado": 0}])
    [item] = _items(session, cot)
    assert (item.producto_id, item.sku_id, item.precio_unitario_estimado) == (None, None, None)


def test_lo_del_carrito_completa_su_producto(client, session, noemi):
    sku = noemi.skus[0]
    cot = _contacto(client, session, [{"sku_id": sku.id, "precio_unitario_estimado": 15990}], origen="CATALOGO")
    [item] = _items(session, cot)
    assert item.producto_id == noemi.id and item.precio_unitario_estimado == 15990


# --- Precio en tres estados --------------------------------------------------

def test_la_tienda_no_puede_regalar(client, session):
    cot = _contacto(client, session, [{"nombre_custom": "Pañuelo", "sin_costo": True}])
    [item] = _items(session, cot)
    assert item.precio_unitario_estimado is None


def test_el_panel_si_puede_regalar(client_admin, session):
    res = client_admin.post("/api/v1/crm/cotizaciones", json={
        "rut": "11111111-1", "nombres": "Ana", "canal": "WhatsApp",
        "items": [{"nombre_custom": "Pañuelo", "sin_costo": True}, {"nombre_custom": "Bolero"}]})
    assert res.status_code == 200, res.text
    precios = sorted([i["precio_unitario_estimado"] for i in res.json()["items"]], key=lambda p: (p is None, p))
    assert precios == [0.0, None]


def _manual(client_admin, **extra) -> dict:
    res = client_admin.post("/api/v1/crm/cotizaciones", json={
        "rut": "11111111-1", "nombres": "Ana", "canal": "WhatsApp",
        "items": [{"nombre_custom": "Bolero tejido"}], **extra})
    assert res.status_code == 200, res.text
    return res.json()


def test_cotizar_queda_en_la_historia(client_admin, session):
    pedido = _manual(client_admin)
    item_id = pedido["items"][0]["id"]
    url = f"/api/v1/crm/cotizaciones/{pedido['id']}/prendas/{item_id}/precio"

    assert client_admin.put(url, json={"precio": 32000}).json() == {"precio": 32000}
    client_admin.put(url, json={"precio": 32000})            # sin cambio: no se anota
    client_admin.put(url, json={"sin_costo": True})
    client_admin.put(url, json={})                           # vuelve a por cotizar

    cambios = [(e.datos["de"], e.datos["a"]) for e in session.exec(
        select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.PRECIO).order_by(PedidoEvento.ocurrido_at, PedidoEvento.id)
    ).all()]
    assert cambios == [(None, 32000), (32000, 0), (0, None)]
    assert session.get(CotizacionItem, item_id).precio_unitario_estimado is None


def test_un_precio_en_cero_no_existe(client_admin):
    pedido = _manual(client_admin)
    url = f"/api/v1/crm/cotizaciones/{pedido['id']}/prendas/{pedido['items'][0]['id']}/precio"
    assert client_admin.put(url, json={"precio": 0}).status_code == 422


def test_un_pedido_confirmado_no_se_cotiza(client_admin):
    pedido = _manual(client_admin)
    client_admin.put(f"/api/v1/crm/cotizaciones/{pedido['id']}/estado", json={"estado": "CONFIRMADA"})
    url = f"/api/v1/crm/cotizaciones/{pedido['id']}/prendas/{pedido['items'][0]['id']}/precio"
    assert client_admin.put(url, json={"precio": 1000}).status_code == 409


def test_la_prenda_tiene_que_ser_de_ese_pedido(client_admin):
    a, b = _manual(client_admin), _manual(client_admin, rut="22222222-2")
    url = f"/api/v1/crm/cotizaciones/{a['id']}/prendas/{b['items'][0]['id']}/precio"
    assert client_admin.put(url, json={"precio": 1000}).status_code == 404


# --- Retiro ------------------------------------------------------------------

def test_un_retiro_no_guarda_datos_de_despacho(client, session):
    cot = _contacto(client, session, [], modo_entrega="RETIRO", region="Ñuble", comuna="Quirihue",
                    comuna_id=None, direccion="Calle 1", transporte="STARKEN")
    assert (cot.region, cot.comuna, cot.direccion, cot.transporte) == (None, None, None, None)
    assert session.exec(select(Direccion)).all() == []


def test_un_despacho_guarda_vacios_como_sin_dato(client, session):
    cot = _contacto(client, session, [], region="", comuna="", direccion="")
    assert (cot.region, cot.comuna, cot.direccion) == (None, None, None)


def test_un_producto_con_piezas_personalizadas_no_se_borra_del_todo(client, session, noemi):
    import asyncio
    from app.api.v1 import catalog_admin

    _contacto(client, session, [{"producto_id": noemi.id, "config_custom": {"TALLA": "XS"}}])
    asyncio.run(catalog_admin.delete_product(noemi.id, force=True, db=session))
    assert session.get(Product, noemi.id).is_deleted
