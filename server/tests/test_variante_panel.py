"""El panel lateral de una variante recibe su código de barras."""

from app.models.catalog import SKU
from tests.apoyo_catalogo import variante


def test_el_panel_lateral_recibe_el_codigo_de_barras(client_admin, session):
    from app.models.catalog import Category, Product
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    p = Product(name="Vestido", slug="pr-vestido", description="", category_id=cat.id)
    session.add(p)
    session.commit()
    s = variante(session, {"TALLA": "S"}, product_id=p.id, sku="PR-VESTIDO-S", price=1000, barcode="2000000000015")
    session.add(s)
    session.commit()
    assert client_admin.get(f"/api/v1/admin/catalog/skus/{s.id}").json()["barcode"] == "2000000000015"
