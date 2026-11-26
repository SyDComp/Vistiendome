"""
Los movimientos de bodega apuntan a su hecho (la prenda del pedido, la línea
de corte) y las estadísticas a su producto y variante, por identidad.
"""

from sqlmodel import select

from app.models.analytics import AnalyticsEvent
from app.models.catalog import Category, MediaAsset, MovementType, Product, StockMovement
from app.models.taller import OrdenCorte, OrdenCorteItem
from tests.apoyo_catalogo import variante


def _vestido(session):
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    prod = Product(name="Vestido", slug="vestido", description="", category_id=cat.id)
    session.add(prod)
    session.commit()
    sku = variante(session, {"TALLA": "M"}, product_id=prod.id, sku="V-M", price=1000)
    session.add(sku)
    session.commit()
    return prod, sku


def test_las_cifras_de_una_variante_no_se_parten_si_cambia_su_codigo(client, client_admin, session):
    prod, sku = _vestido(session)
    client.post("/api/v1/analytics/track", json={"type": "add_to_cart", "product_id": prod.id, "sku": "V-M"})
    sku.sku = "VESTIDO_LARGO-M"          # el producto se renombró: el código cambia
    session.add(sku)
    session.commit()
    client.post("/api/v1/analytics/track", json={"type": "add_to_cart", "product_id": prod.id, "sku": "VESTIDO_LARGO-M"})

    assert [e.sku_id for e in session.exec(select(AnalyticsEvent)).all()] == [sku.id, sku.id]
    top = client_admin.get("/api/v1/analytics/summary").json()["top_cart_variants"]
    assert [(v["sku"], v["count"]) for v in top] == [("VESTIDO_LARGO-M", 2)]


def test_un_codigo_que_no_existe_se_anota_sin_variante(client, session):
    client.post("/api/v1/analytics/track", json={"type": "add_to_cart", "sku": "NO-EXISTE", "product_id": 999})
    [evento] = session.exec(select(AnalyticsEvent)).all()
    assert (evento.sku_id, evento.product_id) == (None, None)


def test_una_orden_que_movio_stock_no_se_borra_aunque_se_haya_reabierto(client_admin, session):
    _, sku = _vestido(session)
    orden = OrdenCorte(numero=1)
    session.add(orden)
    session.commit()
    linea = OrdenCorteItem(orden_id=orden.id, sku_id=sku.id, cantidad=2)
    session.add(linea)
    session.commit()
    # Se terminó (entró a bodega) y se reabrió (salió de vuelta): ya no está finalizada.
    session.add_all([
        StockMovement(sku_id=sku.id, type=MovementType.RECEIPT, quantity=2, orden_corte_item_id=linea.id),
        StockMovement(sku_id=sku.id, type=MovementType.ADJUSTMENT, quantity=-2, orden_corte_item_id=linea.id),
    ])
    session.commit()
    res = client_admin.delete(f"/api/v1/ordenes-corte/{orden.id}")
    assert res.status_code == 403 and "movió stock" in res.text
    assert session.get(OrdenCorte, orden.id) is not None


def test_borrar_una_foto_la_saca_del_carrusel_del_producto(client_admin, session):
    prod, _ = _vestido(session)
    foto = MediaAsset(filename="c.jpg", original_name="c.jpg", url="/media/c.jpg")
    otra = MediaAsset(filename="d.jpg", original_name="d.jpg", url="/media/d.jpg")
    session.add_all([foto, otra])
    session.commit()
    prod.extras = {"preview_carousel": [{"id": foto.id, "url": foto.url}, {"id": otra.id, "url": otra.url}]}
    session.add(prod)
    session.commit()
    client_admin.request("DELETE", "/api/v1/media/batch", json=[foto.id])
    session.expire_all()
    assert [x["id"] for x in session.get(Product, prod.id).extras["preview_carousel"]] == [otra.id]
