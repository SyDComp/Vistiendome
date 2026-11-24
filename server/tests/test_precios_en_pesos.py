"""
Los precios del catálogo son pesos enteros (core/pesos.py): "52.990" leído
como 52,99 se rechaza en vez de quedar en la tienda como "$52,99".
"""

import pytest

from app.api.v1.catalog_admin import ProductCreate, SKUCreate
from app.core import pesos
from app.models.catalog import SKU, Category, Product


def test_un_precio_con_decimales_no_pasa_y_dice_como_escribirlo():
    with pytest.raises(ValueError, match="monto entero"):
        pesos.revisar_precio(52.99)
    assert pesos.revisar_precio(52990) == 52990
    assert pesos.revisar_precio(None) is None


def test_la_oferta_en_pesos_es_entera_pero_el_porcentaje_puede_tener_decimales():
    with pytest.raises(ValueError):
        pesos.revisar_oferta("fixed", 39.99)
    with pytest.raises(ValueError):
        pesos.revisar_oferta("amount", 5.5)
    assert pesos.revisar_oferta("percent", 12.5) == 12.5


def test_crear_o_guardar_un_producto_rechaza_la_variante_con_centavos():
    with pytest.raises(ValueError, match="PR-A-S"):
        SKUCreate(sku="PR-A-S", price=44.99, config={})
    with pytest.raises(ValueError):
        ProductCreate(name="A", slug="a", description="", category_id=1,
                      sale_type="fixed", sale_value=19.99)


def test_editar_la_variante_rechaza_el_precio_con_centavos_sin_tocarlo(client_admin, session):
    cat = Category(name="Abrigos", slug="abrigos")
    session.add(cat)
    session.commit()
    p = Product(name="Abrigo", slug="pr-abrigo", description="", category_id=cat.id)
    session.add(p)
    session.commit()
    s = SKU(product_id=p.id, sku="PR-ABRIGO-S", price=52990, config={"TALLA": "S"})
    session.add(s)
    session.commit()

    r = client_admin.put(f"/api/v1/admin/catalog/skus/{s.id}", json={"price": 52.99})
    assert r.status_code == 422
    session.refresh(s)
    assert s.price == 52990
