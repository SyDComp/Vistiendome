"""
Los pagos de un pedido: se registran, se anulan con motivo y nunca se borran.
El saldo sale de las prendas activas y de los pagos no anulados.
"""

import pytest
from sqlmodel import select

from app.models.historia import PedidoEvento, TipoEvento
from app.models.pagos import Pago
from test_ciclo_pedido import (  # noqa: F401  (tienda es un fixture)
    CRM, _confirmar, _estado, _hechas, _leer, _pedido, sin_abono_minimo, tienda,
)

BOLERO = {"nombre_custom": "Bolero", "precio_unitario_estimado": 10000, "cantidad": 2}


def _pagar(client_admin, pedido, monto, medio="Transferencia", nota=None):
    return client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/pagos", json={"monto": monto, "medio": medio, "nota": nota})


def _cuentas(client_admin, pedido):
    return client_admin.get(f"{CRM}/cotizaciones/{pedido['id']}/pagos").json()["cuentas"]


def test_un_abono_deja_el_saldo_y_el_estado(client_admin, tienda, session):
    pedido = _pedido(client_admin, BOLERO)
    assert _cuentas(client_admin, pedido) == {"total": 20000, "por_cotizar": 0, "pagado": 0, "saldo": 20000, "estado": "SIN_PAGAR"}

    res = _pagar(client_admin, pedido, 8000, nota="Abono por WhatsApp")
    assert res.status_code == 200, res.text
    assert res.json()["cuentas"] == {"total": 20000, "por_cotizar": 0, "pagado": 8000, "saldo": 12000, "estado": "ABONADO"}
    assert _pagar(client_admin, pedido, 12000, medio="Efectivo").json()["cuentas"]["estado"] == "PAGADO"
    # La lista de pedidos también lo sabe.
    assert _leer(client_admin, pedido)["pago"]["estado"] == "PAGADO"

    eventos = session.exec(select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.PAGO)).all()
    assert [e.datos["monto"] for e in eventos] == [8000, 12000]


def test_no_se_paga_mas_de_lo_que_falta(client_admin, tienda):
    pedido = _pedido(client_admin, BOLERO)
    res = _pagar(client_admin, pedido, 25000)
    assert res.status_code == 409 and "$25.000" in res.json()["detail"] and "$20.000" in res.json()["detail"]


def test_con_algo_por_cotizar_se_puede_abonar_igual(client_admin, tienda):
    pedido = _pedido(client_admin, BOLERO, {"nombre_custom": "Chal"})
    res = _pagar(client_admin, pedido, 30000)
    assert res.status_code == 200
    assert res.json()["cuentas"] == {"total": 20000, "por_cotizar": 1, "pagado": 30000, "saldo": -10000, "estado": "ABONADO"}


def test_el_medio_tiene_que_ser_uno_de_ajustes(client_admin, tienda):
    pedido = _pedido(client_admin, BOLERO)
    res = _pagar(client_admin, pedido, 1000, medio="Trueque")
    assert res.status_code == 409 and "Link de pago" in res.json()["detail"]


def test_anular_pide_motivo_no_borra_y_mueve_el_saldo(client_admin, tienda, session):
    pedido = _pedido(client_admin, BOLERO)
    pago = _pagar(client_admin, pedido, 5000).json()["pagos"][0]
    url = f"{CRM}/cotizaciones/{pedido['id']}/pagos/{pago['id']}/anular"

    assert client_admin.post(url, json={"motivo": " "}).status_code == 409
    res = client_admin.post(url, json={"motivo": "Se anotó dos veces"})
    assert res.status_code == 200
    anulado = res.json()["pagos"][0]
    assert (anulado["anulado_motivo"], anulado["anulado_por"]) == ("Se anotó dos veces", "Admin Prueba")
    assert res.json()["cuentas"]["pagado"] == 0
    assert client_admin.post(url, json={"motivo": "otra vez"}).status_code == 409
    assert len(session.exec(select(Pago)).all()) == 1


def test_un_pago_no_se_edita_ni_se_borra(client_admin, tienda, session):
    pedido = _pedido(client_admin, BOLERO)
    _pagar(client_admin, pedido, 5000)
    pago = session.exec(select(Pago)).one()
    pago.monto = 1
    with pytest.raises(ValueError):
        session.commit()
    session.rollback()
    with pytest.raises(ValueError):
        session.delete(pago)
        session.commit()
    session.rollback()


def test_lo_cancelado_no_se_cobra(client_admin, tienda, session):
    pedido = _pedido(client_admin, BOLERO, {"nombre_custom": "Chal", "precio_unitario_estimado": 5000})
    _confirmar(client_admin, pedido)
    client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/prendas/{pedido['items'][1]['id']}/cancelar")
    assert _cuentas(client_admin, pedido)["total"] == 20000


def test_a_un_pedido_cancelado_no_se_le_registran_pagos_y_con_pagos_no_se_borra(client_admin, tienda):
    pedido = _pedido(client_admin, BOLERO)
    _pagar(client_admin, pedido, 1000)
    res = client_admin.delete(f"{CRM}/cotizaciones/{pedido['id']}")
    assert res.status_code == 409 and "pagos" in res.json()["detail"]

    _estado(client_admin, pedido, "CANCELADA")
    assert _pagar(client_admin, pedido, 1000).status_code == 409


def test_los_medios_de_pago_se_editan_en_ajustes(client_admin, tienda):
    res = client_admin.put("/api/v1/ajustes-negocio/medios_pago", json={"valor": ["Efectivo", "Mach"]})
    assert res.status_code == 200
    pedido = _pedido(client_admin, BOLERO)
    assert _pagar(client_admin, pedido, 1000, medio="Mach").status_code == 200


# --- Las reglas del pago en el ciclo (F2-E2) ---------------------------------

def _con_abono_por_defecto(client_admin):
    """Las pruebas de acá miden el abono: vuelve a los valores acordados."""
    assert client_admin.put("/api/v1/ajustes-negocio/abono_minimo",
                            json={"valor": {"bodega": 100, "taller": 50}}).status_code == 200


def test_confirmar_pide_el_abono_minimo_o_una_nota(client_admin, tienda, session):
    _con_abono_por_defecto(client_admin)
    pedido = _pedido(client_admin, BOLERO)  # va al taller: 50% de $20.000
    abono = client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/propuesta", json={}).json()["abono"]
    assert abono == {"minimo": 10000, "porcentaje": 50, "por": "taller", "pagado": 0, "falta": 10000}

    res = _confirmar(client_admin, pedido)
    assert res.status_code == 409 and "$10.000 para el abono mínimo" in res.json()["detail"]

    _pagar(client_admin, pedido, 10000)
    assert _confirmar(client_admin, pedido).status_code == 200


def test_sin_abono_se_confirma_con_nota_y_queda_anotado(client_admin, tienda, session):
    _con_abono_por_defecto(client_admin)
    pedido = _pedido(client_admin, BOLERO)
    _pagar(client_admin, pedido, 4000)
    res = _confirmar(client_admin, pedido, nota="Clienta de siempre, paga al retirar")
    assert res.status_code == 200, res.text
    evento = session.exec(select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.ESTADO)).all()[-1]
    assert evento.datos["abono_faltante"] == 6000


def test_no_sale_con_saldo_pendiente(client_admin, tienda, session):
    pedido = _pedido(client_admin, BOLERO)
    _confirmar(client_admin, pedido)
    _hechas(session, pedido, 0)
    res = _estado(client_admin, pedido, "DESPACHADA")
    assert res.status_code == 409 and "Falta pagar $20.000" in res.json()["detail"]
    _pagar(client_admin, pedido, 20000)
    assert _estado(client_admin, pedido, "DESPACHADA").status_code == 200


def test_lo_pagado_de_mas_se_devuelve_o_queda_a_favor_y_se_usa_despues(client_admin, tienda):
    pedido = _pedido(client_admin, BOLERO)
    _pagar(client_admin, pedido, 15000)
    url = f"{CRM}/cotizaciones/{pedido['id']}/pagos"
    # Sin nada pagado de más no hay qué devolver.
    assert client_admin.post(f"{url}/devolver", json={"monto": 1000, "medio": "Efectivo"}).status_code == 409

    _estado(client_admin, pedido, "CANCELADA")
    assert _cuentas(client_admin, pedido)["estado"] == "PAGADO_DE_MAS"
    assert client_admin.post(f"{url}/devolver", json={"monto": 20000, "medio": "Efectivo"}).status_code == 409
    assert client_admin.post(f"{url}/devolver", json={"monto": 5000, "medio": "Transferencia"}).status_code == 200
    res = client_admin.post(f"{url}/a-favor", json={"monto": 10000, "nota": "Para su próximo pedido"})
    assert res.status_code == 200
    assert res.json()["cuentas"]["saldo"] == 0 and res.json()["a_favor_disponible"] == 10000

    # La misma clienta (mismo RUT) lo usa en otro pedido.
    otro = _pedido(client_admin, BOLERO)
    assert _pagar(client_admin, otro, 12000, medio="Saldo a favor", nota="La conozco").status_code == 409
    # Ninguno de los dos pedidos tiene teléfono: no se puede comprobar, pide nota.
    res = _pagar(client_admin, otro, 10000, medio="Saldo a favor")
    assert res.status_code == 409 and "No se puede comparar el teléfono" in res.json()["detail"]
    res = _pagar(client_admin, otro, 10000, medio="Saldo a favor", nota="Confirmé por llamada")
    assert res.status_code == 200 and res.json()["a_favor_disponible"] == 0

    # Lo dejado a favor ya se usó: no se puede anular sin anular antes el uso.
    a_favor = [p for p in client_admin.get(url).json()["pagos"] if p["tipo"] == "A_FAVOR"][0]
    res = client_admin.post(f"{url}/{a_favor['id']}/anular", json={"motivo": "error"})
    assert res.status_code == 409 and "ya se usó" in res.json()["detail"]


# --- ¿Es la misma persona? (saldo a favor) -----------------------------------

def _con_contacto(client_admin, nombres, telefono, rut="22222222-2"):
    res = client_admin.post(f"{CRM}/cotizaciones", json={
        "rut": rut, "nombres": nombres, "telefono": telefono, "canal": "WhatsApp", "items": [BOLERO]})
    assert res.status_code == 200, res.text
    return res.json()


def _deja_a_favor(client_admin, pedido, monto=20000):
    _pagar(client_admin, pedido, monto)
    _estado(client_admin, pedido, "CANCELADA")
    assert client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/pagos/a-favor", json={"monto": monto}).status_code == 200


def test_mismo_nombre_y_telefono_no_pide_nota(client_admin, tienda, session):
    origen = _con_contacto(client_admin, "María Pérez", "+56 9 8994 4444")
    _deja_a_favor(client_admin, origen)
    nuevo = _con_contacto(client_admin, "maria perez", "989944444")
    datos = client_admin.get(f"{CRM}/cotizaciones/{nuevo['id']}/pagos").json()
    assert datos["a_favor_avisos"] == []
    assert datos["a_favor_origenes"] == [{"pedido_numero": origen["numero"], "monto": 20000,
                                          "nombre": "María Pérez", "telefono": "+56 9 8994 4444"}]
    assert _pagar(client_admin, nuevo, 5000, medio="Saldo a favor").status_code == 200


def test_otro_telefono_u_otro_nombre_pide_nota_y_queda_anotado(client_admin, tienda, session):
    origen = _con_contacto(client_admin, "María Pérez", "+56 9 8994 4444")
    _deja_a_favor(client_admin, origen)
    nuevo = _con_contacto(client_admin, "Josefa Díaz", "+56 9 1111 2222")

    res = _pagar(client_admin, nuevo, 5000, medio="Saldo a favor")
    assert res.status_code == 409
    assert "El teléfono no es el mismo" in res.json()["detail"] and "El nombre no es el mismo" in res.json()["detail"]

    assert _pagar(client_admin, nuevo, 5000, medio="Saldo a favor", nota="Es su hija, lo confirmó María").status_code == 200
    evento = session.exec(select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.PAGO)).all()[-1]
    assert evento.datos["nota"] == "Es su hija, lo confirmó María"
    assert len(evento.datos["verificacion"]) == 2

