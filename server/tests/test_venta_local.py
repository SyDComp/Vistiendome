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
