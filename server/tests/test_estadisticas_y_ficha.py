"""
"Muy vistos, poco pedidos" compara fichas abiertas contra prendas al carrito
(antes contra el clic en la tarjeta, que es lo que abre la ficha), y la ficha
del sitio trae el stock de cada variante con una sola consulta.
"""

import pytest
from sqlmodel import Session

from app.api.v1 import analytics, products
from app.models.analytics import AnalyticsEvent
from app.models.catalog import Category, MovementType, Product, SKU, StockMovement


@pytest.fixture
def dos_productos(session: Session):
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    noemi = Product(name="Vestido Noemi", slug="vestido-noemi", description="", category_id=cat.id)
    tapado = Product(name="Tapado Magdalena", slug="tapado-magdalena", description="", category_id=cat.id)
    session.add_all([noemi, tapado])
    session.commit()
    return noemi, tapado


def _eventos(session, tipo, producto, n):
    session.add_all([AnalyticsEvent(type=tipo, product_id=producto.id) for _ in range(n)])
    session.commit()


def test_muy_vistos_poco_pedidos_compara_vistas_con_carrito(session, dos_productos):
    noemi, tapado = dos_productos
    _eventos(session, "view", noemi, 10)
    _eventos(session, "add_to_cart", noemi, 1)
    _eventos(session, "view", tapado, 6)
    _eventos(session, "add_to_cart", tapado, 3)
    lista = analytics.analytics_summary(db=session, days=30)["interest"]
    assert [p["name"] for p in lista] == ["Vestido Noemi", "Tapado Magdalena"]   # 1 de 10 antes que 3 de 6
    assert lista[0]["add_to_cart"] == 1 and lista[0]["views"] == 10


def test_con_menos_de_cinco_vistas_no_entra(session, dos_productos):
    noemi, _ = dos_productos
    _eventos(session, "view", noemi, analytics.MIN_VISTAS_INTERES - 1)
    assert analytics.analytics_summary(db=session, days=30)["interest"] == []


def test_la_ficha_trae_el_stock_de_cada_variante(session, dos_productos):
    noemi, _ = dos_productos
    skus = [SKU(product_id=noemi.id, sku=f"NOE-{t}", price=16900, config={"TALLA": t}) for t in ("M", "L", "XL")]
    session.add_all(skus)
    session.commit()
    session.add_all([
        StockMovement(sku_id=skus[0].id, type=MovementType.RECEIPT, quantity=5),
        StockMovement(sku_id=skus[0].id, type=MovementType.SALE, quantity=-2),
        StockMovement(sku_id=skus[1].id, type=MovementType.RECEIPT, quantity=1),
    ])
    session.commit()
    ficha = products.get_product_detail(str(noemi.id), db=session)
    assert {s["sku"]: s["stock"] for s in ficha["skus"]} == {"NOE-M": 3, "NOE-L": 1, "NOE-XL": 0}
