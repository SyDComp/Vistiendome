"""
Confirmar con propuesta, apartar en bodega, despachar solo lo de bodega y
volver atrás. Por las rutas del panel, como lo usa la tienda.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.catalog import Category, MovementType, Product, SKU, StockMovement
from app.models.crm import Cotizacion, CotizacionItem
from app.models.historia import PedidoEvento, TipoEvento
from app.models.taller import OrdenCorte, OrdenCorteItem

CRM = "/api/v1/crm"


@pytest.fixture
def tienda(session: Session):
    """Una variante de cada clase de categoría: taller, solo bodega y sin decir."""
    vestimenta = Category(name="Vestimenta", slug="vestimenta", abastecimiento="TALLER", acepta_personalizacion=True)
    accesorios = Category(name="Accesorios", slug="accesorios", abastecimiento="SOLO_BODEGA", acepta_personalizacion=False)
    sin = Category(name="Sin Categoría", slug="sin_categoria", acepta_personalizacion=False)
    session.add_all([vestimenta, accesorios, sin])
    session.commit()
    variantes = {}
    for clave, categoria, nombre in [("vestido", vestimenta, "Vestido Noemi"),
                                     ("cinturon", accesorios, "Cinturón"),
                                     ("suelto", sin, "Pañuelo")]:
        prod = Product(name=nombre, slug=clave, description="", category_id=categoria.id)
        session.add(prod)
        session.commit()
        sku = SKU(product_id=prod.id, sku=clave.upper(), price=10000, config={"TALLA": "M"})
        session.add(sku)
        session.commit()
        variantes[clave] = sku
    return variantes


def _hay(session: Session, sku: SKU, cantidad: int):
    session.add(StockMovement(sku_id=sku.id, type=MovementType.RECEIPT, quantity=cantidad, note="Carga"))
    session.commit()


def _pedido(client_admin: TestClient, *prendas, rut="11111111-1") -> dict:
    """`prendas`: (sku, cantidad) o un dict de prenda tal cual."""
    items = [p if isinstance(p, dict) else {"sku_id": p[0].id, "cantidad": p[1], "precio_unitario_estimado": 10000}
             for p in prendas]
    res = client_admin.post(f"{CRM}/cotizaciones", json={"rut": rut, "nombres": "Ana", "canal": "WhatsApp", "items": items})
    assert res.status_code == 200, res.text
    return res.json()


def _propuesta(client_admin, pedido, **cuerpo) -> dict:
    res = client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/propuesta", json=cuerpo)
    assert res.status_code == 200, res.text
    return res.json()


def _confirmar(client_admin, pedido, **cuerpo):
    """Confirma como la pantalla: lo que vio esperando es lo de la propuesta."""
    if "esperando_vistas" not in cuerpo:
        vista = _propuesta(client_admin, pedido, caminos=cuerpo.get("caminos", {}))
        cuerpo["esperando_vistas"] = [p["item_id"] for p in vista["prendas"] if p["queda"] == "ESPERANDO"]
    return client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/confirmar", json=cuerpo)


def _estado(client_admin, pedido, estado):
    return client_admin.put(f"{CRM}/cotizaciones/{pedido['id']}/estado", json={"estado": estado})


def _leer(client_admin, pedido) -> dict:
    return client_admin.get(f"{CRM}/cotizaciones/{pedido['id']}").json()


def _hechas(session, pedido, *posiciones):
    """Como si la orden de corte que las tenía se hubiera finalizado."""
    for i in posiciones:
        item = session.get(CotizacionItem, pedido["items"][i]["id"])
        item.cortado = True
        session.add(item)
    session.commit()


def _saldo(client_admin, sku) -> dict:
    filas = client_admin.get("/api/v1/admin/catalog/kardex").json()
    return next(f for f in filas if f["sku_id"] == sku.id)


# --- La propuesta -----------------------------------------------------------

def test_con_disponible_propone_bodega(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 2)
    [p] = _propuesta(client_admin, _pedido(client_admin, (tienda["vestido"], 2)))["prendas"]
    assert (p["propuesto"], p["camino"], p["queda"], p["requiere_nota"]) == ("BODEGA", "BODEGA", "APARTADA", False)


def test_sin_disponible_propone_lo_que_dice_la_categoria(client_admin, tienda):
    pedido = _pedido(client_admin, (tienda["vestido"], 1), (tienda["cinturon"], 1), (tienda["suelto"], 1))
    vestido, cinturon, suelto = _propuesta(client_admin, pedido)["prendas"]

    assert vestido["camino"] == "TALLER" and not vestido["requiere_nota"]
    assert (cinturon["camino"], cinturon["queda"], cinturon["requiere_nota"]) == ("BODEGA", "ESPERANDO", True)
    assert "no se confecciona" in cinturon["aviso"]
    assert suelto["camino"] is None and "elige" in suelto["aviso"]


def test_una_personalizada_solo_puede_ir_al_taller(client_admin, tienda):
    pedido = _pedido(client_admin, {"nombre_custom": "Bolero tejido", "precio_unitario_estimado": 5000})
    [p] = _propuesta(client_admin, pedido, caminos={pedido["items"][0]["id"]: "BODEGA"})["prendas"]
    assert (p["opciones"], p["camino"]) == (["TALLER"], "TALLER")


def test_dos_prendas_de_la_misma_variante_no_se_apartan_lo_mismo(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, (tienda["vestido"], 1), (tienda["vestido"], 1))
    primera, segunda = _propuesta(client_admin, pedido)["prendas"]
    assert (primera["camino"], primera["queda"]) == ("BODEGA", "APARTADA")
    assert segunda["camino"] == "TALLER"


# --- Confirmar --------------------------------------------------------------

def test_no_se_confirma_con_prendas_por_cotizar(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, {"sku_id": tienda["vestido"].id, "cantidad": 1, "precio_unitario_estimado": None})
    # El precio de la variante se completa solo; se vuelve a "por cotizar".
    client_admin.put(f"{CRM}/cotizaciones/{pedido['id']}/prendas/{pedido['items'][0]['id']}/precio", json={})
    res = _confirmar(client_admin, pedido)
    assert res.status_code == 409 and "precio" in res.json()["detail"]


def test_sin_camino_hay_que_elegir(client_admin, tienda):
    pedido = _pedido(client_admin, (tienda["suelto"], 1))
    res = _confirmar(client_admin, pedido)
    assert res.status_code == 409 and "Elige de dónde sale" in res.json()["detail"]

    res = _confirmar(client_admin, pedido, caminos={pedido["items"][0]["id"]: "TALLER"})
    assert res.status_code == 200, res.text


def test_confirmar_contra_lo_habitual_pide_nota_y_la_anota(client_admin, tienda, session):
    pedido = _pedido(client_admin, (tienda["cinturon"], 1))
    assert _confirmar(client_admin, pedido).status_code == 409

    res = _confirmar(client_admin, pedido, nota="Llega reposición el jueves")
    assert res.status_code == 200, res.text
    [item] = res.json()["items"]
    assert (item["camino"], item["en_bodega"]) == ("BODEGA", "ESPERANDO")

    evento = session.exec(select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.ESTADO)).all()[-1]
    assert evento.datos["a"] == "CONFIRMADA"
    assert evento.datos["nota"] == "Llega reposición el jueves"
    assert evento.datos["esperando"] == ["Cinturón (M)"]


def test_si_la_bodega_cambio_no_confirma_y_trae_la_propuesta_nueva(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    primero = _pedido(client_admin, (tienda["vestido"], 1))
    segundo = _pedido(client_admin, (tienda["vestido"], 1), rut="22222222-2")
    # El segundo vio la última unidad libre...
    item = segundo["items"][0]["id"]
    assert _propuesta(client_admin, segundo, caminos={item: "BODEGA"})["prendas"][0]["queda"] == "APARTADA"
    # ...pero el primero confirma antes.
    assert _confirmar(client_admin, primero).status_code == 200

    res = _confirmar(client_admin, segundo, caminos={item: "BODEGA"}, esperando_vistas=[], nota="x")
    assert res.status_code == 409
    assert res.json()["propuesta"]["prendas"][0]["queda"] == "ESPERANDO"
    assert _leer(client_admin, segundo)["estado"] == "NUEVA"


# --- Apartado ---------------------------------------------------------------

def test_se_la_lleva_el_que_confirmo_antes_y_al_cancelar_pasa_al_siguiente(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 1)
    primero = _pedido(client_admin, (tienda["cinturon"], 1))
    segundo = _pedido(client_admin, (tienda["cinturon"], 1), rut="22222222-2")
    assert _confirmar(client_admin, primero).status_code == 200
    assert _confirmar(client_admin, segundo, nota="Esperamos reposición").status_code == 200

    assert _leer(client_admin, primero)["items"][0]["en_bodega"] == "APARTADA"
    assert _leer(client_admin, segundo)["items"][0]["en_bodega"] == "ESPERANDO"
    saldo = _saldo(client_admin, tienda["cinturon"])
    assert (saldo["current_stock"], saldo["apartado"], saldo["disponible"]) == (1, 2, -1)

    assert _estado(client_admin, primero, "CANCELADA").status_code == 200
    assert _leer(client_admin, segundo)["items"][0]["en_bodega"] == "APARTADA"
    assert _saldo(client_admin, tienda["cinturon"])["disponible"] == 0


def test_cuando_entra_stock_se_aparta_sola(client_admin, tienda, session):
    pedido = _pedido(client_admin, (tienda["cinturon"], 1))
    assert _confirmar(client_admin, pedido, nota="Llega el jueves").status_code == 200
    _hay(session, tienda["cinturon"], 1)
    assert _leer(client_admin, pedido)["items"][0]["en_bodega"] == "APARTADA"


def test_bodega_dice_para_que_pedidos_esta_apartada(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, (tienda["vestido"], 1))
    _confirmar(client_admin, pedido)
    historial = client_admin.get(f"/api/v1/admin/catalog/kardex/{tienda['vestido'].id}/history").json()
    assert [(a["pedido_numero"], a["cantidad"], a["estado"]) for a in historial["apartados"]] == [(pedido["numero"], 1, "APARTADA")]


# --- Cambios de estado ------------------------------------------------------

def test_a_confirmada_solo_por_confirmar(client_admin, tienda):
    res = _estado(client_admin, _pedido(client_admin, (tienda["vestido"], 1)), "CONFIRMADA")
    assert res.status_code == 409 and "Confirmar pedido" in res.json()["detail"]


def test_solo_se_despacha_lo_confirmado_y_lo_despachado_solo_se_deshace(client_admin, tienda, session):
    pedido = _pedido(client_admin, (tienda["vestido"], 1))
    assert _estado(client_admin, pedido, "DESPACHADA").status_code == 409
    _confirmar(client_admin, pedido)
    _hechas(session, pedido, 0)
    assert _estado(client_admin, pedido, "DESPACHADA").status_code == 200
    assert _estado(client_admin, pedido, "CANCELADA").status_code == 409
    assert _estado(client_admin, pedido, "CONFIRMADA").status_code == 200


def test_volver_a_conversacion_libera_la_bodega_y_no_pierde_lo_cortado(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, (tienda["vestido"], 1), {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000})
    _confirmar(client_admin, pedido)
    bolero = session.get(CotizacionItem, pedido["items"][1]["id"])
    bolero.cortado = True
    session.add(bolero)
    session.commit()

    assert _estado(client_admin, pedido, "EN_CONVERSACION").status_code == 200
    leido = _leer(client_admin, pedido)
    assert [i["camino"] for i in leido["items"]] == [None, None]
    assert leido["items"][1]["cortado"] is True
    assert leido["confirmada_en"] is None
    assert _saldo(client_admin, tienda["vestido"])["apartado"] == 0


# --- Despacho ---------------------------------------------------------------

def test_al_despachar_solo_sale_de_bodega_lo_que_iba_por_bodega(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, (tienda["vestido"], 1), (tienda["vestido"], 1))
    _confirmar(client_admin, pedido)  # una apartada, la otra al taller
    _hechas(session, pedido, 1)
    assert _estado(client_admin, pedido, "DESPACHADA").status_code == 200

    salidas = session.exec(select(StockMovement).where(StockMovement.type == MovementType.SALE)).all()
    assert [(m.reference_id, m.quantity) for m in salidas] == [(pedido["items"][0]["id"], -1)]


def test_no_sale_hasta_que_el_taller_termina_personalizadas_incluidas(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, (tienda["vestido"], 1), {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000})
    _confirmar(client_admin, pedido)

    produccion = _leer(client_admin, pedido)["produccion"]
    assert (produccion["taller"], produccion["hechas"], produccion["bodega"], produccion["listo"]) == (1, 0, 1, False)
    assert produccion["falta"] == ["Bolero: por hacer en el taller"]
    res = _estado(client_admin, pedido, "DESPACHADA")
    assert res.status_code == 409 and "Bolero: por hacer en el taller" in res.json()["detail"]

    _hechas(session, pedido, 1)
    assert _leer(client_admin, pedido)["produccion"]["listo"] is True
    assert _estado(client_admin, pedido, "DESPACHADA").status_code == 200


def test_una_prenda_sin_producto_ni_nombre_no_entra(client_admin):
    res = client_admin.post(f"{CRM}/cotizaciones", json={"rut": "11111111-1", "nombres": "Ana", "canal": "WhatsApp",
                                                        "items": [{"cantidad": 1}]})
    assert res.status_code == 422 and "producto o un nombre" in res.text


def test_no_se_despacha_lo_que_espera_bodega(client_admin, tienda):
    pedido = _pedido(client_admin, (tienda["cinturon"], 1))
    _confirmar(client_admin, pedido, nota="Llega el jueves")
    res = _estado(client_admin, pedido, "DESPACHADA")
    assert res.status_code == 409 and "Cinturón (M): esperando que llegue a bodega" in res.json()["detail"]


def test_al_taller_no_llega_lo_que_va_por_bodega(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, (tienda["vestido"], 1), (tienda["vestido"], 1))
    _confirmar(client_admin, pedido)
    pendientes = client_admin.get("/api/v1/ordenes-corte/pendientes").json()
    assert [p["cotizacion_item_id"] for p in pendientes] == [pedido["items"][1]["id"]]


# --- Quitar una prenda antes de confirmar -----------------------------------

def test_quitar_una_prenda_queda_en_la_historia(client_admin, tienda, session):
    pedido = _pedido(client_admin, (tienda["vestido"], 1), (tienda["cinturon"], 2))
    res = client_admin.delete(f"{CRM}/cotizaciones/{pedido['id']}/prendas/{pedido['items'][1]['id']}")
    assert res.status_code == 200, res.text
    assert len(_leer(client_admin, pedido)["items"]) == 1
    evento = session.exec(select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.PRENDA_QUITADA)).one()
    assert evento.datos == {"prenda": "Cinturón (M)", "cantidad": 2, "precio": 10000}


def test_no_se_quita_de_un_pedido_confirmado_ni_lo_que_esta_en_una_orden(client_admin, tienda, session):
    pedido = _pedido(client_admin, (tienda["vestido"], 1), (tienda["vestido"], 1))
    orden = OrdenCorte(numero=3)
    session.add(orden)
    session.commit()
    session.add(OrdenCorteItem(orden_id=orden.id, sku_id=tienda["vestido"].id, cantidad=1,
                               cotizacion_item_id=pedido["items"][1]["id"]))
    session.commit()
    res = client_admin.delete(f"{CRM}/cotizaciones/{pedido['id']}/prendas/{pedido['items'][1]['id']}")
    assert res.status_code == 409 and "orden de corte N° 3" in res.json()["detail"]

    _confirmar(client_admin, pedido)
    res = client_admin.delete(f"{CRM}/cotizaciones/{pedido['id']}/prendas/{pedido['items'][0]['id']}")
    assert res.status_code == 409
