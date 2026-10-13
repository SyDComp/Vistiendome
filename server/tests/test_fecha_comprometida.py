"""
La fecha comprometida: se propone por el plazo habitual en días hábiles, se
exige al confirmar y se corrige quedando en la historia.
"""

from datetime import date, timedelta

from sqlmodel import select

from app.core.pedidos import fecha
from app.models.historia import PedidoEvento, TipoEvento
from test_ciclo_pedido import (  # noqa: F401  (tienda es un fixture)
    CRM, _confirmar, _estado, _hay, _leer, _pedido, _propuesta, sin_abono_minimo, tienda,
)

AJUSTES = "/api/v1/ajustes-negocio"


def _hoy_mas(dias):
    return (fecha.hoy() + timedelta(days=dias)).isoformat()


def test_los_dias_habiles_saltan_el_fin_de_semana():
    viernes = date(2026, 10, 16)
    assert fecha.sumar_habiles(viernes, 1) == date(2026, 10, 19)   # lunes
    assert fecha.sumar_habiles(viernes, 2) == date(2026, 10, 20)
    assert fecha.sumar_habiles(date(2026, 10, 13), 15) == date(2026, 11, 3)
    assert fecha.sumar_habiles(viernes, 0) == viernes


def test_propone_el_plazo_de_bodega_o_el_del_taller(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    hoy = fecha.hoy()

    solo_bodega = _propuesta(client_admin, _pedido(client_admin, (tienda["vestido"], 1)))
    assert (solo_bodega["plazo_dias"], solo_bodega["plazo_por"]) == (2, "bodega")
    assert solo_bodega["fecha_propuesta"] == fecha.sumar_habiles(hoy, 2).isoformat()

    con_taller = _propuesta(client_admin, _pedido(client_admin, (tienda["vestido"], 1),
                                                  {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000}))
    assert (con_taller["plazo_dias"], con_taller["plazo_por"]) == (15, "taller")


def test_el_plazo_se_ajusta_en_ajustes_del_negocio(client_admin, tienda):
    assert client_admin.put(f"{AJUSTES}/plazos_pedido", json={"valor": {"bodega": 1, "taller": 10}}).status_code == 200
    vista = _propuesta(client_admin, _pedido(client_admin, {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000}))
    assert vista["plazo_dias"] == 10

    res = client_admin.put(f"{AJUSTES}/plazos_pedido", json={"valor": {"bodega": 1, "taller": "mucho"}})
    assert res.status_code == 422 and "taller" in res.json()["detail"]


def test_sin_fecha_o_con_una_pasada_no_se_confirma(client_admin, tienda):
    pedido = _pedido(client_admin, {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000})
    res = _confirmar(client_admin, pedido, fecha_comprometida=None)
    assert res.status_code == 409 and "fecha comprometida" in res.json()["detail"]
    res = _confirmar(client_admin, pedido, fecha_comprometida=_hoy_mas(-1))
    assert res.status_code == 409 and "anterior a hoy" in res.json()["detail"]


def test_confirmar_la_guarda_y_la_historia_la_dice(client_admin, tienda, session):
    pedido = _pedido(client_admin, {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000})
    assert _confirmar(client_admin, pedido, fecha_comprometida=_hoy_mas(20)).status_code == 200
    assert _leer(client_admin, pedido)["fecha_comprometida"] == _hoy_mas(20)
    evento = session.exec(select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.ESTADO)).all()[-1]
    assert evento.datos["fecha"] == _hoy_mas(20)


def test_corregirla_queda_en_la_historia_con_su_motivo(client_admin, tienda, session):
    pedido = _pedido(client_admin, {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000})
    url = f"{CRM}/cotizaciones/{pedido['id']}/fecha"
    assert client_admin.put(url, json={"fecha": _hoy_mas(5)}).status_code == 409   # sin confirmar

    _confirmar(client_admin, pedido, fecha_comprometida=_hoy_mas(20))
    res = client_admin.put(url, json={"fecha": _hoy_mas(25), "nota": "La tela llegó tarde"})
    assert res.status_code == 200 and res.json()["fecha_comprometida"] == _hoy_mas(25)
    assert client_admin.put(url, json={"fecha": _hoy_mas(25)}).status_code == 200   # la misma: no se anota
    assert client_admin.put(url, json={"fecha": _hoy_mas(-2)}).status_code == 409

    [evento] = session.exec(select(PedidoEvento).where(PedidoEvento.tipo == TipoEvento.FECHA)).all()
    assert evento.datos == {"de": _hoy_mas(20), "a": _hoy_mas(25), "nota": "La tela llegó tarde"}


def test_volver_a_conversar_borra_la_fecha(client_admin, tienda):
    pedido = _pedido(client_admin, {"nombre_custom": "Bolero", "precio_unitario_estimado": 5000})
    _confirmar(client_admin, pedido)
    assert _leer(client_admin, pedido)["fecha_comprometida"] is not None
    _estado(client_admin, pedido, "EN_CONVERSACION")
    assert _leer(client_admin, pedido)["fecha_comprometida"] is None
