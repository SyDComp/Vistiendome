"""
El árbol de categorías del sitio: una que no sale en los filtros no deja a sus
hijas sueltas como si fueran principales; cuelgan de la más cercana que sí sale.
"""

from app.models.catalog import Category

ARBOL = "/api/v1/products/categories/tree"


def test_las_hijas_de_una_oculta_cuelgan_de_la_abuela(client, session):
    vestimenta = Category(name="Vestimenta", slug="vestimenta", level=1)
    session.add(vestimenta)
    session.commit()
    blazers = Category(name="Blazers", slug="blazers", level=2, parent_id=vestimenta.id, is_filterable=False)
    session.add(blazers)
    session.commit()
    session.add_all([
        Category(name="Mezclilla", slug="mezclilla", level=3, parent_id=blazers.id),
        Category(name="Largo Rubí", slug="largo_rubi", level=3, parent_id=blazers.id),
        Category(name="Lecturas", slug="lecturas", level=1),
    ])
    session.commit()

    arbol = client.get(ARBOL).json()
    assert [c["name"] for c in arbol] == ["Vestimenta", "Lecturas"]
    assert sorted(h["name"] for h in arbol[0]["children"]) == ["Largo Rubí", "Mezclilla"]
