"""
Los pagos de un pedido: se registran, se anulan con motivo y nunca se borran.
El saldo sale de las prendas activas y de los pagos no anulados.
"""

import pytest
from sqlmodel import select

from app.models.historia import PedidoEvento, TipoEvento
from app.models.pagos import Pago
from test_ciclo_pedido import (  # noqa: F401  (tienda es un fixture)
    CRM, _confirmar, _estado, _hechas, _leer, _pedido, tienda,
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
