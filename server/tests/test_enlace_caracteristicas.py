"""
Las variantes, las especificaciones y los precios por cantidad apuntan a la
característica y a la opción por su identidad, no por su nombre.

El caso real (2026-11-25): la tienda renombró CUELLO a ESCOTE y 764
variantes siguieron diciendo CUELLO, porque cada una guardaba el nombre como
texto. Renombrar tiene que verse en todos lados en el mismo momento.
"""

ATRIBUTOS = "/api/v1/admin/catalog/attributes"
PRODUCTOS = "/api/v1/admin/catalog/products"
ESPECIFICACIONES = "/api/v1/admin/catalog/specifications"
TRAMOS = "/api/v1/settings/price_tiers"


def _cuello(client_admin):
    res = client_admin.post(ATRIBUTOS, json={"name": "cuello", "domain": [{"value": "en v"}, {"value": "redondo"}]})
    assert res.status_code == 200, res.text
    return res.json()


def _producto(client_admin, session, configs):
    from app.models.catalog import Category
    categoria = Category(name="Vestimenta", slug="vestimenta")
    session.add(categoria)
    session.commit()
    res = client_admin.post(PRODUCTOS, json={
        "name": "Vestido", "slug": "vestido", "description": "", "category_id": categoria.id,
        "skus": [{"sku": f"V-{i}", "price": 1000, "config": c} for i, c in enumerate(configs)],
    })
    assert res.status_code in (200, 201), res.text
    return res.json()["id"]


def _configs(client_admin, producto_id):
    res = client_admin.get(f"{PRODUCTOS}/{producto_id}")
    assert res.status_code == 200, res.text
    return sorted((s["config"] for s in res.json()["skus"]), key=str)


def _renombrar(client_admin, atributo, **cambios):
    res = client_admin.put(f"{ATRIBUTOS}/{atributo['id']}", json={**atributo, **cambios})
    assert res.status_code == 200, res.text
    return res.json()


def _opcion(atributo, valor):
    return next(o for o in atributo["domain"] if o["value"] == valor)


def test_renombrar_una_caracteristica_se_ve_en_sus_variantes(client_admin, session):
    client_admin.get(ATRIBUTOS)                      # siembra Talla, Color y Estampado
    cuello = _cuello(client_admin)
    producto = _producto(client_admin, session, [{"CUELLO": "Redondo", "TALLA": "S"}])

    _renombrar(client_admin, cuello, name="escote")

    assert _configs(client_admin, producto) == [{"ESCOTE": "Redondo", "TALLA": "S"}]


def test_renombrar_una_opcion_se_ve_en_sus_variantes(client_admin, session):
    client_admin.get(ATRIBUTOS)
    cuello = _cuello(client_admin)
    producto = _producto(client_admin, session, [{"CUELLO": "Redondo"}, {"CUELLO": "En V"}])

    dominio = [{**o, "value": "bote"} if o["value"] == "Redondo" else o for o in cuello["domain"]]
    nuevo = _renombrar(client_admin, cuello, domain=dominio)

    assert _configs(client_admin, producto) == [{"CUELLO": "Bote"}, {"CUELLO": "En V"}]
    # La opción es la misma, con otro nombre: no se borró una y se creó otra.
    assert _opcion(nuevo, "Bote")["id"] == _opcion(cuello, "Redondo")["id"]


def test_no_se_quita_una_opcion_que_usan_variantes(client_admin, session):
    client_admin.get(ATRIBUTOS)
    cuello = _cuello(client_admin)
    _producto(client_admin, session, [{"CUELLO": "Redondo"}])

    sin_redondo = [o for o in cuello["domain"] if o["value"] != "Redondo"]
    res = client_admin.put(f"{ATRIBUTOS}/{cuello['id']}", json={**cuello, "domain": sin_redondo})

    assert res.status_code == 400 and "Redondo" in res.text and "1 variante" in res.text
    assert [o["value"] for o in client_admin.get(f"{ATRIBUTOS}/{cuello['id']}").json()["domain"]] == ["En V", "Redondo"]


def test_una_opcion_sin_uso_se_puede_quitar(client_admin, session):
    client_admin.get(ATRIBUTOS)
    cuello = _cuello(client_admin)
    sin_redondo = [o for o in cuello["domain"] if o["value"] != "Redondo"]
    assert [o["value"] for o in _renombrar(client_admin, cuello, domain=sin_redondo)["domain"]] == ["En V"]


def test_una_variante_no_puede_tener_una_opcion_que_no_existe(client_admin, session):
    client_admin.get(ATRIBUTOS)
    _cuello(client_admin)
    from app.models.catalog import Category, Product, SKU
    from sqlmodel import select
    categoria = Category(name="Vestimenta", slug="vestimenta")
    session.add(categoria)
    session.commit()

    for config, falta in (({"CUELLO": "Cuadrado"}, "Cuadrado"), ({"MANGA": "Larga"}, "MANGA")):
        res = client_admin.post(PRODUCTOS, json={
            "name": "Vestido", "slug": "vestido", "description": "", "category_id": categoria.id,
            "skus": [{"sku": "V-1", "price": 1000, "config": config}],
        })
        assert res.status_code == 422 and falta in res.text, res.text
    # Ni la variante ni el producto: rechazar a medias dejaba un producto vacío.
    assert session.exec(select(SKU)).all() == [] and session.exec(select(Product)).all() == []


def test_las_opciones_salen_con_su_identidad_y_en_su_orden(client_admin):
    client_admin.get(ATRIBUTOS)
    cuello = _cuello(client_admin)
    assert [o["value"] for o in cuello["domain"]] == ["En V", "Redondo"]
    assert all(isinstance(o["id"], int) for o in cuello["domain"])
    invertido = _renombrar(client_admin, cuello, domain=list(reversed(cuello["domain"])))
    assert [o["value"] for o in invertido["domain"]] == ["Redondo", "En V"]


def test_las_especificaciones_siguen_a_la_opcion_renombrada(client_admin):
    client_admin.get(ATRIBUTOS)
    cuello = _cuello(client_admin)
    res = client_admin.post(ESPECIFICACIONES, json={
        "name": "Vestido de fiesta", "category_ids": [],
        "characteristics": [{"id": cuello["id"], "allowed_values": ["Redondo"]}],
    })
    assert res.status_code == 200, res.text

    dominio = [{**o, "value": "bote"} if o["value"] == "Redondo" else o for o in cuello["domain"]]
    _renombrar(client_admin, cuello, name="escote", domain=dominio)

    [espec] = client_admin.get(ESPECIFICACIONES).json()
    assert [(c["name"], c["allowed_values"]) for c in espec["characteristics"]] == [("ESCOTE", ["Bote"])]


def test_los_precios_por_cantidad_siguen_a_la_caracteristica_y_sus_opciones(client_admin):
    client_admin.get(ATRIBUTOS)
    cuello = _cuello(client_admin)
    tramo = {"name": "iglesia", "characteristic": "CUELLO", "from": "En V", "to": "Redondo", "min_qty": 6,
             "discount_type": "amount", "discount_value": 3000, "active": True, "productos": []}
    res = client_admin.post(TRAMOS, json={"value": {"tiers": [tramo]}})
    assert res.status_code == 200, res.text

    dominio = [{**o, "value": "bote"} if o["value"] == "Redondo" else o for o in cuello["domain"]]
    _renombrar(client_admin, cuello, name="escote", domain=dominio)

    [guardado] = client_admin.get(TRAMOS).json()["tiers"]
    assert (guardado["characteristic"], guardado["from"], guardado["to"]) == ("ESCOTE", "En V", "Bote")
    assert {k: guardado[k] for k in ("name", "min_qty", "discount_type", "discount_value", "active")} == \
        {"name": "iglesia", "min_qty": 6, "discount_type": "amount", "discount_value": 3000, "active": True}
