"""
Una personalizada de Contacto llega sin precio: al confirmar se ve entre cuánto
y cuánto va su modelo, y una vez cotizada deja de impedir la confirmación.
"""

from test_ciclo_pedido import sin_abono_minimo  # noqa: F401  (fixture)
from test_prendas_pedido import _contacto, noemi  # noqa: F401  (noemi es un fixture)

CRM = "/api/v1/crm"


def test_la_personalizada_trae_el_rango_del_modelo_y_se_cotiza_ahi(client, client_admin, session, noemi):
    cot = _contacto(client, session, [{"producto_id": noemi.id, "nombre_custom": "Vestido Noemi",
                                       "config_custom": {"TALLA": "5XL"}}])
    propuesta = client_admin.post(f"{CRM}/cotizaciones/{cot.id}/propuesta", json={}).json()
    [prenda] = propuesta["prendas"]
    assert prenda["precio"] is None
    precios = sorted(s.price for s in noemi.skus)
    assert prenda["rango_modelo"] == [precios[0], precios[-1]]
    assert any("precio" in p.lower() for p in propuesta["problemas"])

    res = client_admin.put(f"{CRM}/cotizaciones/{cot.id}/prendas/{prenda['item_id']}/precio",
                           json={"precio": 19990, "sin_costo": False})
    assert res.status_code == 200, res.text
    despues = client_admin.post(f"{CRM}/cotizaciones/{cot.id}/propuesta", json={}).json()
    assert despues["prendas"][0]["precio"] == 19990 and despues["prendas"][0]["rango_modelo"] is None
    assert not any("precio" in p.lower() for p in despues["problemas"])
