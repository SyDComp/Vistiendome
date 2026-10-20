"""
La política de cambios: un ajuste (plazo, unidad y si lo hecho a medida tiene
cambio), público para el sitio, y copiado en cada pedido al entregarse para que
el comprobante diga lo que se le prometió a esa clienta.
"""

import pytest

from test_ciclo_pedido import _hay, tienda  # noqa: F401  (tienda es fixture)
from test_venta_local import _vender

AJUSTE = "/api/v1/ajustes-negocio/politica_cambios"
PUBLICA = "/api/v1/politica-cambios"


def test_por_defecto_son_15_dias_y_lo_hecho_a_medida_no_tiene_cambio(client):
    assert client.get(PUBLICA).json() == {
        "plazo": 15, "unidad": "dias", "personalizadas_sin_cambio": True, "texto_plazo": "15 días",
    }


def test_se_cambia_desde_los_ajustes_y_el_sitio_lo_ve(client_admin, client):
    res = client_admin.put(AJUSTE, json={"valor": {"plazo": "1", "unidad": "meses", "personalizadas_sin_cambio": False}})
    assert res.status_code == 200, res.text
    assert client.get(PUBLICA).json()["texto_plazo"] == "1 mes"
    assert client.get(PUBLICA).json()["personalizadas_sin_cambio"] is False


@pytest.mark.parametrize("valor", [
    "15 días", {"plazo": "quince", "unidad": "dias"}, {"plazo": -1, "unidad": "dias"},
    {"plazo": 400, "unidad": "dias"}, {"plazo": 10, "unidad": "años"},
])
def test_lo_que_no_es_una_politica_no_se_guarda(client_admin, valor):
    assert client_admin.put(AJUSTE, json={"valor": valor}).status_code == 422


def test_el_pedido_guarda_la_politica_de_cuando_se_entrego(client_admin, tienda, session):
    _hay(session, tienda["cinturon"], 1)
    pedido = _vender(client_admin, [{"sku_id": tienda["cinturon"].id, "precio": 9000}],
                     [{"monto": 9000, "medio": "Efectivo"}]).json()
    client_admin.put(AJUSTE, json={"valor": {"plazo": 10, "unidad": "dias", "personalizadas_sin_cambio": True}})

    leido = next(p for p in client_admin.get("/api/v1/crm/").json() if p["id"] == pedido["id"])
    assert leido["politica_cambios"] == {"plazo": 15, "unidad": "dias", "personalizadas_sin_cambio": True}

