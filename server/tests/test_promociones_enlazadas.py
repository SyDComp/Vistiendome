"""
Las promociones apuntan a sus productos por identidad (tablas promocion y
promocion_producto). El panel las sigue leyendo y guardando como el ajuste
`promotions`, igual que antes.
"""

PROMOS = "/api/v1/settings/promotions"


def _producto(session, nombre="Vestido"):
    from app.models.catalog import Category, Product
    cat = Category(name="Vestimenta", slug=f"vestimenta-{nombre.lower()}")
    session.add(cat)
    session.commit()
    p = Product(name=nombre, slug=nombre.lower(), description="", category_id=cat.id)
    session.add(p)
    session.commit()
    return p


TRES_POR_DOS = {
    "name": "3x2", "type": "cantidad", "lleva": 3, "paga": 2, "descuento": 100,
    "desde": "2026-12-01", "hasta": "2026-12-31", "combinable": False, "active": True,
}
REGALO = {
    "name": "Regalo", "type": "regalo", "min_unidades": 0, "min_monto": 50000,
    "regalo_texto": "Un pañuelo", "desde": "", "hasta": "", "combinable": True, "active": False,
}


def test_se_guardan_y_se_leen_igual_con_sus_productos(client_admin, session):
    p = _producto(session)
    res = client_admin.post(PROMOS, json={"value": {"promos": [{**TRES_POR_DOS, "productos": [str(p.id)]}, {**REGALO, "productos": []}]}})
    assert res.status_code == 200, res.text

    leidas = client_admin.get(PROMOS).json()["promos"]
    assert leidas[0] == {**TRES_POR_DOS, "productos": [str(p.id)], "min_unidades": 0, "min_monto": 0, "regalo_texto": ""}
    assert leidas[1] == {**REGALO, "productos": [], "lleva": 0, "paga": 0, "descuento": 0}
    assert client_admin.get("/api/v1/settings").json()["promotions"]["promos"] == leidas


def test_un_producto_que_no_existe_no_se_guarda(client_admin, session):
    res = client_admin.post(PROMOS, json={"value": {"promos": [{**TRES_POR_DOS, "productos": ["999"]}]}})
    assert res.status_code == 422 and "999" in res.text
    assert client_admin.get(PROMOS).json() == {"promos": []}


def test_un_producto_en_una_promocion_sigue_siendo_ese_producto(client_admin, session):
    """Renombrar el producto no cambia a qué producto apunta la promoción."""
    p = _producto(session)
    client_admin.post(PROMOS, json={"value": {"promos": [{**TRES_POR_DOS, "productos": [str(p.id)]}]}})
    p.name = "Vestido Renombrado"
    session.add(p)
    session.commit()
    assert client_admin.get(PROMOS).json()["promos"][0]["productos"] == [str(p.id)]


def test_un_producto_en_una_promocion_no_se_borra_del_todo(client_admin, session):
    """Si se borrara y era el único de la promoción, la promoción pasaría a valer para todo el catálogo."""
    from app.models.catalog import Product
    p = _producto(session)
    client_admin.post(PROMOS, json={"value": {"promos": [{**TRES_POR_DOS, "productos": [str(p.id)]}]}})
    res = client_admin.delete(f"/api/v1/admin/catalog/products/{p.id}?force=true")
    assert res.status_code == 200, res.text
    session.expire_all()
    assert session.get(Product, p.id).is_deleted is True
    assert client_admin.get(PROMOS).json()["promos"][0]["productos"] == [str(p.id)]
