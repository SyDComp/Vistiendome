"""
Los códigos de variante salen del nombre del producto y sus valores. Cambiarlos
no puede costar ni una variante ni una unidad: al guardar, la variante se
reconoce aunque la pantalla venga con su código viejo.
"""

import pytest
from sqlmodel import Session, select

from app.core.codigos_variante import codigo_de
from app.models.catalog import Category, MovementType, Product, SKU, StockMovement

PRODUCTOS = "/api/v1/admin/catalog/products"


def _sku(codigo, talla, **extra):
    return {"sku": codigo, "price": 1000, "config": {"TALLA": talla, "COLOR": "Negro"}, **extra}


@pytest.fixture
def producto(client_admin, session: Session):
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    res = client_admin.post(PRODUCTOS, json={"name": "Vestidito", "slug": "x", "description": "", "category_id": cat.id,
                                             "skus": [_sku("A", "S"), _sku("B", "M")]})
    assert res.status_code in (200, 201), res.text
    p = session.get(Product, res.json()["id"])
    for s in _variantes(session, p):
        session.add(StockMovement(sku_id=s.id, type=MovementType.RECEIPT, quantity=5, note="Carga"))
    session.commit()
    return p


def _variantes(session, p):
    session.expire_all()
    return session.exec(select(SKU).where(SKU.product_id == p.id).order_by(SKU.id)).all()


def _guardar(client_admin, p, nombre, skus):
    res = client_admin.put(f"{PRODUCTOS}/{p.id}", json={"name": nombre, "slug": "x", "description": "",
                                                        "category_id": p.category_id, "skus": skus})
    assert res.status_code == 200, res.text
    return res.json()


def _stock(session, sku_id):
    return sum(m.quantity for m in session.exec(select(StockMovement).where(StockMovement.sku_id == sku_id)).all())


def test_la_regla_no_depende_del_orden_y_limpia_los_valores():
    assert codigo_de("pr-vestido_perla", {"TALLA": "12", "MANGAS": "3/4", "Estampado": "Floral Primavera"}) \
        == "PR-VESTIDO_PERLA-FLORAL_PRIMAVERA-34-12"
    assert codigo_de("pr-vestido_perla", {"MANGAS": "3/4", "Estampado": "Floral Primavera", "TALLA": "12"}) \
        == "PR-VESTIDO_PERLA-FLORAL_PRIMAVERA-34-12"
    assert codigo_de("pr-biblia", {}) == "PR-BIBLIA"


def test_al_crear_el_codigo_lo_pone_el_servidor(session, producto):
    assert [s.sku for s in _variantes(session, producto)] == ["PR-VESTIDITO-NEGRO-S", "PR-VESTIDITO-NEGRO-M"]


def test_al_renombrar_los_codigos_siguen_al_nombre_sin_tocar_variantes_ni_stock(client_admin, session, producto):
    antes = _variantes(session, producto)
    ids = [s.id for s in antes]
    r = _guardar(client_admin, producto, "Vestido Perla", [_sku(s.sku, s.config["TALLA"], id=s.id) for s in antes])

    despues = _variantes(session, producto)
    assert [s.id for s in despues] == ids
    assert [s.sku for s in despues] == ["PR-VESTIDO_PERLA-NEGRO-S", "PR-VESTIDO_PERLA-NEGRO-M"]
    assert all(not s.is_deleted for s in despues)
    assert [_stock(session, i) for i in ids] == [5, 5]
    assert r["codigos"] == {str(s.id): s.sku for s in despues}


def test_una_pantalla_con_codigos_viejos_no_duplica_ni_da_de_baja(client_admin, session, producto):
    antes = _variantes(session, producto)
    viejos = [(s.sku, s.config["TALLA"]) for s in antes]
    ids = [s.id for s in antes]
    _guardar(client_admin, producto, "Vestido Perla", [_sku(c, t, id=i) for (c, t), i in zip(viejos, ids)])

    # La misma pantalla, sin id y con el código de antes (y un stock que no vale).
    _guardar(client_admin, producto, "Vestido Perla", [_sku(c, t, stock=0) for c, t in viejos])

    despues = _variantes(session, producto)
    assert [s.id for s in despues] == ids
    assert all(not s.is_deleted for s in despues)
    assert [_stock(session, i) for i in ids] == [5, 5]


def test_la_que_ya_no_viene_se_sigue_retirando(client_admin, session, producto):
    primera, segunda = _variantes(session, producto)
    _guardar(client_admin, producto, "Vestidito", [_sku(primera.sku, "S", id=primera.id)])
    ids_activas = [s.id for s in _variantes(session, producto) if not s.is_deleted]
    assert ids_activas == [primera.id]


def test_una_baja_y_una_activa_con_los_mismos_valores_no_chocan(client_admin, session, producto):
    primera, segunda = _variantes(session, producto)
    segunda.is_deleted = True
    segunda.config = dict(primera.config)
    session.add(segunda)
    session.commit()
    _guardar(client_admin, producto, "Vestido Perla", [_sku(primera.sku, "S", id=primera.id)])

    activa, baja = _variantes(session, producto)
    assert activa.sku == "PR-VESTIDO_PERLA-NEGRO-S"
    assert baja.sku == "PR-VESTIDO_PERLA-NEGRO-S_2"


def test_las_tallas_grandes_quedan_como_en_su_caracteristica(client_admin, session):
    from app.api.v1.catalog_admin import normalize_opt
    assert [normalize_opt(v) for v in ("2xl", "7XL", "xs", "3/4", "rojo italiano", "Tela punto roma")] == \
        ["2XL", "7XL", "XS", "3/4", "Rojo Italiano", "Tela Punto Roma"]

    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    res = client_admin.post(PRODUCTOS, json={"name": "Vestido", "slug": "x", "description": "", "category_id": cat.id,
                                             "skus": [{"sku": "A", "price": 1000, "config": {"talla": "3xl"}}]})
    assert res.status_code in (200, 201), res.text
    [v] = session.exec(select(SKU).where(SKU.product_id == res.json()["id"])).all()
    assert v.config == {"TALLA": "3XL"}
