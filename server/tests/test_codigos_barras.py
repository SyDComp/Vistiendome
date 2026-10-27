"""
Los códigos de barras: correlativos con prefijo interno 20 y dígito de
control siempre bien calculado. Uno escrito a mano con forma de EAN-13 tiene
que cuadrar.
"""

import barcode
import pytest

from app.core.codigos_barras import CodigoInvalido, codigo_desde, es_ean13_valido, revisar

PRODUCTOS = "/api/v1/admin/catalog/products"


def test_el_codigo_es_el_correlativo_con_prefijo_y_control_bien_calculado():
    for n in (1, 7, 1094, 9_999_999_999):
        codigo = codigo_desde(n)
        assert codigo.startswith("20") and len(codigo) == 13
        # La librería de códigos de barras calcula el dígito por su cuenta.
        assert barcode.get("ean13", codigo[:12]).get_fullcode() == codigo
    with pytest.raises(ValueError):
        codigo_desde(10 ** 10)


def test_un_ean13_escrito_a_mano_tiene_que_cuadrar():
    assert revisar(" 2000000000015 ") == "2000000000015"
    assert revisar("") is None
    assert revisar("CODIGO-PROVEEDOR-1") == "CODIGO-PROVEEDOR-1"
    with pytest.raises(CodigoInvalido, match="debería ser 4"):
        revisar("5915697439607")
    assert not es_ean13_valido("5915697439607")


def test_las_variantes_nuevas_reciben_codigos_correlativos(client_admin, session):
    from app.models.catalog import Category
    categoria = Category(name="Vestimenta", slug="vestimenta")
    session.add(categoria)
    session.commit()
    res = client_admin.post(PRODUCTOS, json={
        "name": "Vestido", "slug": "vestido", "description": "", "category_id": categoria.id,
        "skus": [{"sku": "V-S", "price": 1000, "config": {"TALLA": "S"}},
                 {"sku": "V-M", "price": 1000, "config": {"TALLA": "M"}, "barcode": ""}],
    })
    assert res.status_code in (200, 201), res.text
    from sqlmodel import select
    from app.models.catalog import SKU
    assert sorted(s.barcode for s in session.exec(select(SKU)).all()) == [codigo_desde(1), codigo_desde(2)]


def test_un_codigo_que_no_cuadra_no_se_guarda(client_admin, session):
    from app.models.catalog import Category
    categoria = Category(name="Vestimenta", slug="vestimenta")
    session.add(categoria)
    session.commit()
    res = client_admin.post(PRODUCTOS, json={
        "name": "Vestido", "slug": "vestido", "description": "", "category_id": categoria.id,
        "skus": [{"sku": "V-S", "price": 1000, "config": {"TALLA": "S"}, "barcode": "5915697439607"}],
    })
    assert res.status_code == 422 and "debería ser 4" in res.text
