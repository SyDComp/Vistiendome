"""
Las fotos de la Galería y las prendas del catálogo se nombran por identidad
en las colecciones, la portada y los ajustes del sitio.

  · La portada de una colección es una foto (portada_id), no una dirección.
  · Al borrar una foto, sale de todo lo que la usaba: no queda una imagen rota.
  · Una prenda del catálogo puesta en la portada lleva a su dirección de hoy,
    y deja de mostrarse si la variante ya no se vende.
"""

from sqlmodel import select

from app.models.catalog import Category, Collection, MediaAsset, Product
from app.models.cms import HomepageSection
from app.models.settings import SiteSetting
from tests.apoyo_catalogo import variante

COLECCIONES = "/api/v1/admin/catalog/collections"


def _foto(session, nombre="abc"):
    foto = MediaAsset(filename=f"{nombre}.jpg", original_name=f"{nombre}.jpg", url=f"/media/{nombre}.jpg")
    session.add(foto)
    session.commit()
    return foto


def _coleccion(client_admin, url):
    return client_admin.post(COLECCIONES, json={"name": "Invierno", "image_url": url, "sku_ids": []})


def test_la_portada_de_una_coleccion_es_la_foto_y_sigue_su_nombre(client_admin, session):
    foto = _foto(session)
    res = _coleccion(client_admin, "/media/derivadas/abc_md.webp")   # una versión liviana de la foto
    assert res.status_code == 200, res.text
    c = session.exec(select(Collection)).one()
    assert c.portada_id == foto.id

    foto.url = "/media/abc-renombrada.jpg"                         # la foto cambia de nombre
    session.add(foto)
    session.commit()
    assert client_admin.get(f"{COLECCIONES}/{c.id}").json()["image_url"] == "/media/abc-renombrada.jpg"
    assert client_admin.get("/api/v1/collections/").json()[0]["image_url"] == "/media/abc-renombrada.jpg"


def test_una_direccion_que_no_es_de_la_galeria_no_es_portada(client_admin, session):
    res = _coleccion(client_admin, "https://otro-sitio.cl/foto.jpg")
    assert res.status_code == 422 and "Galería" in res.text


def test_borrar_una_foto_la_saca_de_todo_lo_que_la_usaba(client_admin, session):
    foto = _foto(session)
    otra = _foto(session, "otra")
    _coleccion(client_admin, foto.url)
    seccion = HomepageSection(type="hero", title="Portada", config={"layers": [
        {"type": "image", "asset_id": foto.id, "url": foto.url},
        {"type": "image", "asset_id": otra.id, "url": otra.url},
        {"type": "text", "content": "Hola"},
    ]})
    session.add_all([seccion, SiteSetting(key="welcome_modal", value={"title": "Bienvenida", "image_asset_id": foto.id, "image_url": foto.url})])
    session.commit()

    usos = client_admin.post("/api/v1/media/check-references", json=[foto.id]).json()["references"][0]["associations"]
    assert {u["type"] for u in usos} == {"collection", "homepage", "setting"}

    client_admin.request("DELETE", "/api/v1/media/batch", json=[foto.id])
    session.expire_all()
    assert session.get(MediaAsset, foto.id) is None
    assert session.exec(select(Collection)).one().portada_id is None
    assert [c.get("asset_id") for c in session.get(HomepageSection, seccion.id).config["layers"]] == [otra.id, None]
    bienvenida = session.exec(select(SiteSetting).where(SiteSetting.key == "welcome_modal")).one().value
    assert bienvenida == {"title": "Bienvenida", "image_asset_id": None, "image_url": ""}


def test_una_prenda_en_la_portada_lleva_a_su_direccion_de_hoy(client, session):
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    prod = Product(name="Vestido", slug="vestido", description="", category_id=cat.id)
    session.add(prod)
    session.commit()
    sku = variante(session, {"TALLA": "M"}, product_id=prod.id, sku="V-M", price=1000)
    session.add(sku)
    session.commit()
    session.add(HomepageSection(type="hero", title="Portada", config={"layers": [
        {"type": "image", "sku_id": sku.id, "link": "/catalogo/producto/1/viejo"},   # el link que se copió al ponerla
        {"type": "image", "link": "/a-mano"},
    ]}))
    session.commit()

    capas = lambda: client.get("/api/v1/homepage/").json()[0]["config"]["layers"]
    assert [c["link"] for c in capas()] == ["/catalogo/producto/vestido/V-M", "/a-mano"]

    prod.slug = "vestido-largo"                     # el producto cambia de nombre
    sku.sku = "VL-M"
    session.add_all([prod, sku])
    session.commit()
    assert capas()[0]["link"] == "/catalogo/producto/vestido-largo/VL-M"

    sku.is_deleted = True                           # deja de venderse
    session.add(sku)
    session.commit()
    assert [c["link"] for c in capas()] == ["/a-mano"]
