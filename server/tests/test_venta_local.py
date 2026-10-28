"""
Venta rápida en el local: un pedido que se crea, se paga, se confirma y se
entrega de una vez, con las reglas de siempre. Queda entera o no queda nada.
"""

from sqlmodel import select

from app.models.catalog import MovementType, StockMovement
from app.models.crm import Cotizacion
from app.models.historia import PedidoEvento
from app.models.iam import Persona
from app.models.piezas import PiezaUnica
from test_ciclo_pedido import (  # noqa: F401  (tienda y sin_abono_minimo son fixtures)
    CRM, _confirmar, _hay, _hechas, _pedido, sin_abono_minimo, tienda,
)

VENTA = f"{CRM}/venta-local"


def _vender(client_admin, prendas, pagos, clienta=None):
    return client_admin.post(VENTA, json={"clienta": clienta, "prendas": prendas, "pagos": pagos})


def test_se_vende_lo_que_hay_y_queda_entregado_y_pagado(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 3)
    res = _vender(client_admin, [{"sku_id": tienda["cinturon"].id, "cantidad": 2, "precio": 9000}],
                  [{"monto": 10000, "medio": "Efectivo"}, {"monto": 8000, "medio": "Débito"}],
                  clienta={"rut": "33333333-3", "nombres": "Rosa", "telefono": "+56911112222"})
    assert res.status_code == 200, res.text
    pedido = res.json()
    assert (pedido["estado"], pedido["canal"], pedido["modo_entrega"]) == ("DESPACHADA", "En la tienda", "RETIRO")
    assert pedido["pago"]["estado"] == "PAGADO" and pedido["pago"]["total"] == 18000
    assert pedido["fecha_comprometida"] is not None

    salida = session.exec(select(StockMovement).where(StockMovement.type == MovementType.SALE)).one()
    assert salida.quantity == -2

    tipos = [e.tipo for e in session.exec(select(PedidoEvento).order_by(PedidoEvento.secuencia)).all()]
    assert tipos == ["CREADO", "PAGO", "PAGO", "ESTADO", "ESTADO"]


def test_venta_sin_datos_no_crea_ni_inventa_una_clienta(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 1)
    clientas_antes = len(session.exec(select(Persona)).all())
    res = _vender(client_admin, [{"sku_id": tienda["cinturon"].id, "precio": 9000}], [{"monto": 9000, "medio": "Efectivo"}])
    assert res.status_code == 200, res.text
    assert res.json()["persona_id"] is None and res.json()["nombre_contacto"] == "Venta en el local"
    assert len(session.exec(select(Persona)).all()) == clientas_antes


def test_lo_que_no_hay_no_se_vende_y_no_queda_nada(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 1)
    pedidos_antes = len(session.exec(select(Cotizacion)).all())
    res = _vender(client_admin, [{"sku_id": tienda["cinturon"].id, "cantidad": 2, "precio": 9000}],
                  [{"monto": 18000, "medio": "Efectivo"}])
    assert res.status_code == 409 and "No hay suficiente en bodega" in res.json()["detail"]
    assert len(session.exec(select(Cotizacion)).all()) == pedidos_antes
    assert session.exec(select(StockMovement).where(StockMovement.type == MovementType.SALE)).all() == []


def test_los_pagos_tienen_que_sumar_el_total(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 1)
    res = _vender(client_admin, [{"sku_id": tienda["cinturon"].id, "precio": 9000}], [{"monto": 5000, "medio": "Efectivo"}])
    assert res.status_code == 409 and "$5.000" in res.json()["detail"] and "$9.000" in res.json()["detail"]


def test_se_vende_una_pieza_unica(client_admin, tienda, session):
    bolero = {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000, "config_custom": {"TALLA": "M"}}
    pedido = _pedido(client_admin, bolero)
    _confirmar(client_admin, pedido)
    _hechas(session, pedido, 0)
    client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/prendas/{pedido['items'][0]['id']}/cancelar")
    [pieza] = [d for d in client_admin.get(f"{VENTA}/disponible").json() if d["tipo"] == "pieza"]

    res = _vender(client_admin, [{"pieza_id": pieza["pieza_id"], "precio": 7000}], [{"monto": 7000, "medio": "Transferencia"}])
    assert res.status_code == 200, res.text
    assert session.exec(select(PiezaUnica)).one().estado == "VENDIDA"


def test_lo_disponible_no_incluye_lo_apartado(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    _confirmar(client_admin, _pedido(client_admin, (tienda["vestido"], 1)))   # se aparta la única
    _hay(session, tienda["cinturon"], 2)
    disponible = {d["codigo"]: d["disponible"] for d in client_admin.get(f"{VENTA}/disponible").json()}
    assert disponible == {"CINTURON": 2}


def test_la_pistola_encuentra_por_codigo_de_barras_o_por_codigo(client_admin, tienda, session):
    tienda["cinturon"].barcode = "7800000000017"
    session.add(tienda["cinturon"])
    session.commit()
    _hay(session, tienda["cinturon"], 2)

    por_barras = client_admin.get(f"{VENTA}/codigo/7800000000017").json()
    assert (por_barras["sku_id"], por_barras["disponible"], por_barras["precio"]) == (tienda["cinturon"].id, 2, 10000)
    assert client_admin.get(f"{VENTA}/codigo/cinturon").json()["sku_id"] == tienda["cinturon"].id


def test_la_pistola_dice_si_no_existe_o_si_no_queda(client_admin, tienda):
    res = client_admin.get(f"{VENTA}/codigo/999")
    assert res.status_code == 404 and "999" in res.json()["detail"]
    res = client_admin.get(f"{VENTA}/codigo/VESTIDO")
    assert res.status_code == 409 and "Vestido Noemi" in res.json()["detail"]


def test_los_productos_de_la_caja_traen_lo_libre_y_lo_mas_vendido_primero(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 3)
    _hay(session, tienda["suelto"], 5)
    _vender(client_admin, [{"sku_id": tienda["cinturon"].id, "cantidad": 2, "precio": 9000}],
            [{"monto": 18000, "medio": "Efectivo"}])
    productos = client_admin.get(f"{VENTA}/catalogo").json()["productos"]
    # El vestido no tiene stock: sale igual, al final y con 0 libres, no se esconde.
    assert [(p["nombre"], p["libres"], p["vendidos"]) for p in productos] == [
        ("Cinturón", 1, 2), ("Pañuelo", 5, 0), ("Vestido Noemi", 0, 0)]
    variante = next(d for d in client_admin.get(f"{VENTA}/disponible").json() if d["codigo"] == "SUELTO")
    assert variante["producto_id"] == tienda["suelto"].product_id


def test_el_catalogo_de_la_caja_filtra_pagina_y_cuenta(client_admin, tienda, session):
    from app.models.catalog import SKU, Characteristic
    session.add(Characteristic(name="TALLA", domain=[{"value": "M"}, {"value": "L"}], is_filterable=True))
    _hay(session, tienda["cinturon"], 3)
    _hay(session, tienda["suelto"], 5)
    negro = SKU(product_id=tienda["suelto"].product_id, sku="SUELTO-L", price=10000, config={"TALLA": "L"})
    session.add(negro)
    session.commit()
    _hay(session, negro, 1)

    todo = client_admin.get(f"{VENTA}/catalogo").json()
    assert (todo["total"], todo["paginas"]) == (3, 1)   # el vestido, sin stock, también
    talla = next(f for f in todo["facetas"] if f["clave"] == "TALLA")
    assert {o["valor"]: o["productos"] for o in talla["opciones"]} == {"M": 3, "L": 1}

    solo_l = client_admin.get(f"{VENTA}/catalogo", params={"valor": "TALLA=L"}).json()
    assert [p["nombre"] for p in solo_l["productos"]] == ["Pañuelo"]
    assert solo_l["productos"][0]["libres"] == 1
    # La faceta de Talla sigue contando las otras tallas: se puede cambiar de opción.
    assert {o["valor"] for o in next(f for f in solo_l["facetas"] if f["clave"] == "TALLA")["opciones"]} == {"M", "L"}

    accesorios = client_admin.get(f"{VENTA}/catalogo", params={"categoria": tienda["cinturon"].product.category_id}).json()
    assert [p["nombre"] for p in accesorios["productos"]] == ["Cinturón"]

    variantes = client_admin.get(f"{VENTA}/productos/{tienda['suelto'].product_id}/variantes").json()
    assert sorted(v["codigo"] for v in variantes) == ["SUELTO", "SUELTO-L"]


def test_el_buscador_de_la_caja_entiende_palabras_sin_tildes(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 3)
    _hay(session, tienda["suelto"], 5)
    r = client_admin.get(f"{VENTA}/buscar", params={"palabra": ["cinturones"], "valor": "TALLA=M"}).json()
    assert r["total"] == 1 and r["resultados"][0]["nombre"] == "Cinturón"


def test_la_caja_muestra_todo_lo_que_cumple_con_su_stock_aunque_sea_cero(client_admin, tienda, session):
    """Escribir "rojo" tiene que traer toda prenda roja: la que no tiene stock sale con 0, después."""
    from app.models.catalog import SKU
    rojo_sin = SKU(product_id=tienda["vestido"].product_id, sku="VESTIDO-ROJO", price=10000,
                   config={"COLOR": "Rojo Italiano"})
    rojo_con = SKU(product_id=tienda["suelto"].product_id, sku="SUELTO-ROJO", price=10000,
                   config={"COLOR": "Rojo Italiano"})
    session.add_all([rojo_sin, rojo_con])
    session.commit()
    _hay(session, rojo_con, 2)

    r = client_admin.get(f"{VENTA}/buscar", params={"valor": "COLOR=Rojo Italiano"}).json()
    assert r["total"] == 2
    assert [(d["codigo"], d["disponible"]) for d in r["resultados"]] == [("SUELTO-ROJO", 2), ("VESTIDO-ROJO", 0)]

    pagina = client_admin.get(f"{VENTA}/catalogo", params={"valor": "COLOR=Rojo Italiano"}).json()
    assert [(p["nombre"], p["libres"]) for p in pagina["productos"]] == [("Pañuelo", 2), ("Vestido Noemi", 0)]

    # Al abrir el producto sin stock se ven sus variantes, apagadas; venderla no se puede.
    variantes = client_admin.get(f"{VENTA}/productos/{tienda['vestido'].product_id}/variantes").json()
    assert {v["codigo"]: v["disponible"] for v in variantes} == {"VESTIDO": 0, "VESTIDO-ROJO": 0}
    assert "VESTIDO-ROJO" not in {d["codigo"] for d in client_admin.get(f"{VENTA}/disponible").json()}
    res = _vender(client_admin, [{"sku_id": rojo_sin.id, "cantidad": 1, "precio": 10000}],
                  [{"monto": 10000, "medio": "Efectivo"}])
    assert res.status_code == 409


def test_el_cierre_cuenta_todo_lo_cobrado_del_dia_por_medio(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 5)
    _vender(client_admin, [{"sku_id": tienda["cinturon"].id, "cantidad": 2, "precio": 9000}],
            [{"monto": 10000, "medio": "Efectivo"}, {"monto": 8000, "medio": "Débito"}])
    # Un abono en efectivo de un pedido que no es de la caja también está en el cajón.
    otro = _pedido(client_admin, (tienda["cinturon"], 1))
    client_admin.post(f"{CRM}/cotizaciones/{otro['id']}/pagos", json={"monto": 3000, "medio": "Efectivo"})
    # Uno anotado y anulado el mismo día no cuenta.
    mal = client_admin.post(f"{CRM}/cotizaciones/{otro['id']}/pagos", json={"monto": 999, "medio": "Efectivo"}).json()
    pago_id = next(p["id"] for p in mal["pagos"] if p["monto"] == 999)
    client_admin.post(f"{CRM}/cotizaciones/{otro['id']}/pagos/{pago_id}/anular", json={"motivo": "mal anotado"})

    c = client_admin.get(f"{VENTA}/cierre").json()
    assert {m["medio"]: m["neto"] for m in c["por_medio"]} == {"Efectivo": 13000, "Débito": 8000}
    assert c["por_medio"][0]["medio"] == "Efectivo"
    assert (c["efectivo_en_cajon"], c["total_neto"]) == (13000, 21000)
    assert [(v["total"], v["estado"]) for v in c["ventas_caja"]] == [(18000, "DESPACHADA")]
    assert c["anulados_despues"] == []


def test_el_cierre_de_otro_dia_viene_vacio(client_admin, tienda, session):
    c = client_admin.get(f"{VENTA}/cierre", params={"fecha": "2020-01-01"}).json()
    assert (c["por_medio"], c["ventas_caja"], c["efectivo_en_cajon"]) == ([], [], None)
