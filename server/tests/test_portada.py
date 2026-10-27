"""
La portada de un producto sale de una sola regla (core/portada.py): la
principal de la galería, si no la primera de la galería, y si la galería está
vacía, la primera foto de sus variantes vigentes.

Reportado: dos productos con sus fotos cargadas en las variantes salían con el
ícono de caja en el panel y en la caja, mientras el sitio sí los mostraba.
"""

import pytest
from sqlmodel import Session

from app.api.v1 import products
from app.core.caja.fotos import fotos
from app.core.portada import portadas
from app.models.catalog import Category, MediaAsset, Product, ProductMediaLink, SKU, SKUMediaLink


def _foto(session: Session, nombre: str) -> MediaAsset:
    a = MediaAsset(filename=nombre, original_name=nombre, url=f"/media/{nombre}",
                   metadata_json={"derivadas": {"sm": f"/media/derivadas/{nombre}_sm.webp"}})
    session.add(a)
    session.commit()
    return a


@pytest.fixture
def producto(session: Session):
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    p = Product(name="vestido perla", slug="vestido-perla", description="", category_id=cat.id)
    session.add(p)
    session.commit()
    skus = [SKU(product_id=p.id, sku=f"PER-{i}", price=20000, config={"TALLA": t}) for i, t in enumerate("SML")]
    session.add_all(skus)
    session.commit()
    return p, skus


def test_la_principal_de_la_galeria_gana_aunque_no_sea_la_primera(session, producto):
    p, _ = producto
    primera, principal = _foto(session, "a.jpg"), _foto(session, "b.jpg")
    session.add_all([ProductMediaLink(product_id=p.id, media_asset_id=primera.id),
                     ProductMediaLink(product_id=p.id, media_asset_id=principal.id, is_main=True)])
    session.commit()
    assert portadas(session, [p.id])[p.id].id == principal.id


def test_sin_principal_va_la_primera_de_la_galeria_aunque_haya_fotos_en_variantes(session, producto):
    p, skus = producto
    de_variante, segunda, primera = _foto(session, "v.jpg"), _foto(session, "g2.jpg"), _foto(session, "g1.jpg")
    session.add(SKUMediaLink(sku_id=skus[0].id, media_asset_id=de_variante.id))
    session.add_all([ProductMediaLink(product_id=p.id, media_asset_id=primera.id),
                     ProductMediaLink(product_id=p.id, media_asset_id=segunda.id)])
    session.commit()
    assert portadas(session, [p.id])[p.id].id == segunda.id      # la de menor id, no la del orden de carga


def test_con_la_galeria_vacia_va_la_foto_de_la_primera_variante_que_tenga(session, producto):
    p, skus = producto
    foto = _foto(session, "l.jpg")
    session.add(SKUMediaLink(sku_id=skus[2].id, media_asset_id=foto.id))     # solo la talla L tiene foto
    session.commit()
    assert portadas(session, [p.id])[p.id].id == foto.id


def test_una_variante_dada_de_baja_no_presta_su_foto(session, producto):
    p, skus = producto
    foto = _foto(session, "baja.jpg")
    session.add(SKUMediaLink(sku_id=skus[0].id, media_asset_id=foto.id))
    skus[0].is_deleted = True
    session.add(skus[0])
    session.commit()
    assert portadas(session, [p.id]) == {}


def test_las_tarjetas_de_la_caja_muestran_la_foto_de_la_variante_con_sus_derivadas(session, producto):
    p, skus = producto
    foto = _foto(session, "caja.jpg")
    session.add(SKUMediaLink(sku_id=skus[1].id, media_asset_id=foto.id))
    session.commit()
    url, srcset = fotos(session, [p.id])[p.id]
    assert url == "/media/caja.jpg"
    assert "caja.jpg_sm.webp 400w" in srcset


def test_la_ficha_del_sitio_trae_las_derivadas_aunque_la_portada_sea_de_una_variante(session, producto):
    p, skus = producto
    foto = _foto(session, "ficha.jpg")
    session.add(SKUMediaLink(sku_id=skus[1].id, media_asset_id=foto.id))
    session.commit()
    ficha = products.get_product_detail(str(p.id), db=session)
    assert ficha["image"] == "/media/ficha.jpg"
    assert "ficha.jpg_sm.webp 400w" in ficha["image_srcset"]
