"""
La dirección de un producto sale de su nombre, y el explorador muestra todo
producto, sea lo que sea: una tarjeta por cada forma de verse.
"""

import pytest
from sqlmodel import Session

from app.models.catalog import Category, Characteristic, Product, SKU

PRODUCTOS = "/api/v1/admin/catalog/products"


@pytest.fixture
def categoria(session: Session):
    c = Category(name="Vestimenta", slug="vestimenta")
    session.add(c)
    session.commit()
    return c


def _crear(client_admin, categoria, nombre, slug="lo-que-mande-el-formulario"):
    res = client_admin.post(PRODUCTOS, json={"name": nombre, "slug": slug, "description": "", "category_id": categoria.id})
    assert res.status_code in (200, 201), res.text
    return res.json()


def _renombrar(client_admin, categoria, producto_id, nombre, slug="pr-vieja"):
    res = client_admin.put(f"{PRODUCTOS}/{producto_id}", json={"name": nombre, "slug": slug, "description": "", "category_id": categoria.id})
    assert res.status_code == 200, res.text


def test_la_direccion_sale_del_nombre_al_crear_y_al_renombrar(client_admin, session, categoria):
    creado = _crear(client_admin, categoria, "Vestidito")
    producto = session.get(Product, creado["id"])
    assert producto.slug == "pr-vestidito"

    _renombrar(client_admin, categoria, producto.id, "Vestido Perlá")
    session.refresh(producto)
    assert producto.slug == "pr-vestido_perla"


def test_dos_productos_con_el_mismo_nombre_no_chocan(client_admin, session, categoria):
    uno = _crear(client_admin, categoria, "Vestido")
    dos = _crear(client_admin, categoria, "Vestido")
    assert session.get(Product, uno["id"]).slug == "pr-vestido"
    assert session.get(Product, dos["id"]).slug == "pr-vestido_2"

    # Guardar sin cambiar el nombre no le cambia la dirección.
    _renombrar(client_admin, categoria, uno["id"], "Vestido")
    session.expire_all()
    assert session.get(Product, uno["id"]).slug == "pr-vestido"


def test_el_explorador_muestra_todo_producto_sea_lo_que_sea(client, session):
    raiz = Category(name="Vestimenta", slug="vestimenta")
    lecturas = Category(name="Lecturas", slug="lecturas")
    accesorios = Category(name="Accesorios", slug="accesorios")
    session.add_all([raiz, lecturas, accesorios, Characteristic(name="COLOR", afecta_apariencia=True),
                     Characteristic(name="TALLA", afecta_apariencia=False)])
    session.commit()

    # Directo en una categoría principal, con dos formas de verse.
    vestido = Product(name="Vestido", slug="pr-vestido", description="", category_id=raiz.id)
    # Sin ninguna característica visual: una sola tarjeta.
    biblia = Product(name="Biblia", slug="pr-biblia", description="", category_id=lecturas.id)
    # Sin variantes todavía: igual se ve.
    corbata = Product(name="Corbata", slug="pr-corbata", description="", category_id=accesorios.id)
    session.add_all([vestido, biblia, corbata])
    session.commit()
    session.add_all([
        SKU(product_id=vestido.id, sku="V-N", price=1000, config={"COLOR": "Negro", "TALLA": "S"}),
        SKU(product_id=vestido.id, sku="V-N2", price=1000, config={"COLOR": "Negro", "TALLA": "M"}),
        SKU(product_id=vestido.id, sku="V-A", price=1000, config={"COLOR": "Azul", "TALLA": "S"}),
        SKU(product_id=biblia.id, sku="B-1", price=5000, config={"TALLA": "Grande"}),
        SKU(product_id=biblia.id, sku="B-2", price=5000, config={"TALLA": "Chica"}),
    ])
    session.commit()

    looks = client.get("/api/v1/products/looks").json()["looks"]
    assert sorted(l["name"] for l in looks) == ["Biblia", "Corbata", "Vestido · Azul", "Vestido · Negro"]
