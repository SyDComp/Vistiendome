"""
Cómo se consigue cada categoría, y qué pasa al crearlas, moverlas y borrarlas.

    padre › hijo › subhijo
    borrar subhijo → padre › hijo
    borrar hijo    → padre › subhijo
    borrar padre   → hijo › subhijo
"""

import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.api.v1.catalog_admin import SKUCreate, SKUUpdate, SLUG_SIN_CATEGORIA
from app.core import categorias
from app.models.catalog import Category, Product

URL = "/api/v1/admin/catalog/categories"


@pytest.fixture
def arbol(session: Session):
    """Sin Categoría, y padre (taller, acepta) › hijo › subhijo, con un producto en cada nivel."""
    comodin = Category(name="Sin Categoría", slug=SLUG_SIN_CATEGORIA, path="/sin_categoria")
    padre = Category(name="Vestimenta", slug="vestimenta", path="/vestimenta",
                     abastecimiento=categorias.TALLER, acepta_personalizacion=True)
    session.add_all([comodin, padre])
    session.commit()
    hijo = Category(name="Vestidos", slug="vestidos", parent_id=padre.id, level=2, path="/vestimenta/vestidos")
    session.add(hijo)
    session.commit()
    subhijo = Category(name="Noemi", slug="noemi", parent_id=hijo.id, level=3, path="/vestimenta/vestidos/noemi")
    session.add(subhijo)
    session.commit()
    productos = {}
    for c in (padre, hijo, subhijo):
        p = Product(name=f"Producto de {c.name}", slug=f"p-{c.slug}", description="", category_id=c.id)
        session.add(p)
        session.commit()
        productos[c.name] = p
    return {"comodin": comodin, "padre": padre, "hijo": hijo, "subhijo": subhijo, "productos": productos}


def _cat(session, c) -> Category:
    session.expire_all()
    return session.get(Category, c.id)


# --- Herencia ----------------------------------------------------------------

def test_una_subcategoria_hereda_y_dice_de_quien(arbol):
    ef = categorias.efectivos(arbol["subhijo"])
    assert ef.abastecimiento == categorias.TALLER and ef.abastecimiento_desde.name == "Vestimenta"
    assert ef.acepta_personalizacion is True


def test_un_valor_propio_manda_sobre_el_heredado(session, arbol):
    hijo = arbol["hijo"]
    hijo.abastecimiento = categorias.SOLO_BODEGA
    session.add(hijo)
    session.commit()
    ef = categorias.efectivos(arbol["subhijo"])
    assert ef.abastecimiento == categorias.SOLO_BODEGA and ef.abastecimiento_desde.name == "Vestidos"


def test_sin_categoria_se_decide_al_confirmar(arbol):
    ef = categorias.efectivos(arbol["comodin"])
    assert ef.abastecimiento is None and ef.acepta_personalizacion is False


# --- Crear, renombrar, mover --------------------------------------------------

def test_una_principal_nueva_dice_como_se_abastece(client_admin: TestClient):
    assert client_admin.post(URL, json={"name": "Calzado"}).status_code == 422
    res = client_admin.post(URL, json={"name": "Calzado", "abastecimiento": "SOLO_BODEGA", "acepta_personalizacion": False})
    assert res.status_code == 200, res.text


def test_una_subcategoria_nueva_puede_heredar(client_admin: TestClient, arbol):
    res = client_admin.post(URL, json={"name": "Faldas", "parent_id": arbol["padre"].id})
    assert res.status_code == 200, res.text
    detalle = client_admin.get(f"{URL}/{res.json()['id']}").json()
    assert detalle["abastecimiento"] is None
    assert detalle["abastecimiento_efectivo"] == "TALLER" and detalle["abastecimiento_heredado_de"] == "Vestimenta"


def test_un_abastecimiento_inventado_no_se_acepta(client_admin: TestClient, arbol):
    res = client_admin.post(URL, json={"name": "X", "parent_id": arbol["padre"].id, "abastecimiento": "MAGIA"})
    assert res.status_code == 422


def test_dos_categorias_con_el_mismo_nombre_no_chocan(client_admin: TestClient, arbol):
    poleras = client_admin.post(URL, json={"name": "Poleras", "parent_id": arbol["padre"].id}).json()
    res = client_admin.post(URL, json={"name": "Noemi", "parent_id": poleras["id"]})
    assert res.status_code == 200, res.text
    assert res.json()["slug"] == "poleras_noemi"


def test_renombrar_no_cambia_la_direccion_publica(client_admin: TestClient, session, arbol):
    res = client_admin.put(f"{URL}/{arbol['subhijo'].id}", json={"name": "Noemí Clásico"})
    assert res.status_code == 200, res.text
    assert _cat(session, arbol["subhijo"]).slug == "noemi"


def test_pasar_a_principal_conserva_su_comportamiento(client_admin: TestClient, session, arbol):
    res = client_admin.put(f"{URL}/{arbol['hijo'].id}", json={"parent_id": None})
    assert res.status_code == 200, res.text
    hijo = _cat(session, arbol["hijo"])
    assert (hijo.parent_id, hijo.level, hijo.abastecimiento, hijo.acepta_personalizacion) == (None, 1, "TALLER", True)
    assert _cat(session, arbol["subhijo"]).level == 2


def test_no_se_mueve_dentro_de_si_misma(client_admin: TestClient, arbol):
    res = client_admin.put(f"{URL}/{arbol['padre'].id}", json={"parent_id": arbol["subhijo"].id})
    assert res.status_code == 400


def test_una_principal_no_queda_sin_decir_como_se_abastece(client_admin: TestClient, arbol):
    res = client_admin.put(f"{URL}/{arbol['padre'].id}", json={"abastecimiento": None})
    assert res.status_code == 422


# --- Borrar: lo que colgaba sube un nivel -------------------------------------

def test_borrar_el_subhijo_deja_padre_e_hijo_tal_cual(client_admin, session, arbol):
    client_admin.delete(f"{URL}/{arbol['subhijo'].id}")
    hijo = _cat(session, arbol["hijo"])
    assert hijo.parent_id == arbol["padre"].id and hijo.level == 2
    # Su producto sube al hijo.
    assert session.get(Product, arbol["productos"]["Noemi"].id).category_id == arbol["hijo"].id


def test_borrar_el_hijo_sube_al_subhijo_y_sus_productos(client_admin, session, arbol):
    client_admin.delete(f"{URL}/{arbol['hijo'].id}")
    subhijo = _cat(session, arbol["subhijo"])
    assert (subhijo.parent_id, subhijo.level, subhijo.path) == (arbol["padre"].id, 2, "/vestimenta/noemi")
    assert session.get(Product, arbol["productos"]["Vestidos"].id).category_id == arbol["padre"].id


def test_borrar_el_padre_deja_al_hijo_como_principal(client_admin, session, arbol):
    client_admin.delete(f"{URL}/{arbol['padre'].id}")
    hijo, subhijo = _cat(session, arbol["hijo"]), _cat(session, arbol["subhijo"])
    assert (hijo.parent_id, hijo.level) == (None, 1)
    assert (hijo.abastecimiento, hijo.acepta_personalizacion) == ("TALLER", True)
    assert (subhijo.parent_id, subhijo.level) == (arbol["hijo"].id, 2)
    # Una principal no tiene padre: sus productos van a Sin Categoría.
    assert session.get(Product, arbol["productos"]["Vestimenta"].id).category_id == arbol["comodin"].id


def test_al_subir_no_cambia_el_comportamiento_en_silencio(client_admin, session, arbol):
    """El hijo dice taller; el padre, solo bodega. El subhijo heredaba taller del hijo."""
    padre, hijo = arbol["padre"], arbol["hijo"]
    padre.abastecimiento, hijo.abastecimiento = categorias.SOLO_BODEGA, categorias.TALLER
    session.add_all([padre, hijo])
    session.commit()

    client_admin.delete(f"{URL}/{hijo.id}")
    subhijo = _cat(session, arbol["subhijo"])
    assert subhijo.abastecimiento == categorias.TALLER  # se le copió lo que tenía


def test_el_aviso_dice_a_donde_va_todo_antes_de_borrar(client_admin, session, arbol):
    padre, hijo = arbol["padre"], arbol["hijo"]
    hijo.abastecimiento = categorias.SOLO_BODEGA
    session.add(hijo)
    session.commit()

    plan = client_admin.get(f"{URL}/{hijo.id}/borrado").json()
    assert plan["subcategorias"] == 1 and plan["subcategorias_pasan_a"] == "Vestimenta"
    assert plan["productos"] == 1 and plan["productos_pasan_a"] == "Vestimenta"
    assert plan["abastecimiento_de_productos"] == {
        "de": "Solo lo que hay en bodega", "a": "Se confecciona en el taller"}
    assert _cat(session, hijo) is not None  # mirar no borra


def test_sin_categoria_no_se_borra(client_admin, arbol):
    assert client_admin.delete(f"{URL}/{arbol['comodin'].id}").status_code == 403


# --- Precio de las variantes del catálogo -------------------------------------

def test_una_variante_del_catalogo_siempre_tiene_monto():
    for precio in (None, 0, -5):
        with pytest.raises(ValidationError):
            SKUCreate(sku="X-M", price=precio, config={"TALLA": "M"})
    assert SKUCreate(sku="X-M", price=17490, config={"TALLA": "M"}).price == 17490


def test_cambiar_el_precio_a_cero_no_se_acepta():
    with pytest.raises(ValidationError):
        SKUUpdate(price=0)
    assert SKUUpdate(price=None).price is None  # no tocarlo sí se puede


# --- La tienda sabe si un producto acepta personalizaciones ------------------

def test_la_tienda_sabe_si_acepta_personalizaciones(client: TestClient, session, arbol):
    lecturas = Category(name="Lecturas", slug="lecturas", path="/lecturas",
                        abastecimiento=categorias.SOLO_BODEGA, acepta_personalizacion=False)
    session.add(lecturas)
    session.commit()
    session.add(Product(name="Biblia", slug="biblia", description="", category_id=lecturas.id))
    session.commit()

    por_nombre = {p["name"]: p["acepta_personalizacion"] for p in client.get("/api/v1/products/").json()}
    assert por_nombre["Biblia"] is False
    assert por_nombre["Producto de Noemi"] is True
