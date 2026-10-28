"""
Cancelar prendas y pedidos sin dejar nada en el limbo, y las piezas únicas.
Por las rutas del panel.
"""

from sqlmodel import select

from app.models.catalog import MovementType, StockMovement
from app.models.crm import CotizacionItem
from app.models.historia import PedidoEvento, TipoEvento
from app.models.piezas import PiezaUnica
from test_ciclo_pedido import (  # noqa: F401  (tienda es un fixture)
    CRM, _confirmar, _estado, _hay, _hechas, _leer, _pagar_todo, _pedido, _saldo, sin_abono_minimo, tienda,
)

BOLERO = {"nombre_custom": "Bolero tejido", "precio_unitario_estimado": 5000, "config_custom": {"TALLA": "M"}}


def _cancelar(client_admin, pedido, i):
    return client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/prendas/{pedido['items'][i]['id']}/cancelar")


def _eventos(session, tipo):
    return session.exec(select(PedidoEvento).where(PedidoEvento.tipo == tipo).order_by(PedidoEvento.secuencia)).all()


def _orden(client_admin, pedido, i):
    item = pedido["items"][i]
    res = client_admin.post("/api/v1/ordenes-corte/", json={"items": [
        {"cotizacion_item_id": item["id"], "sku_id": item["sku_id"], "cantidad": item["cantidad"],
         "nombre_custom": item["sku_name"]}]})
    assert res.status_code == 200, res.text
    return res.json()


def _orden_estado(client_admin, orden, estado):
    assert client_admin.put(f"/api/v1/ordenes-corte/{orden['id']}/estado", json={"estado": estado}).status_code == 200


# --- Cancelar una prenda ----------------------------------------------------

def test_cancelar_lo_que_se_iba_a_buscar_no_suma_stock_al_terminar_la_orden(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, (tienda["vestido"], 1))
    _confirmar(client_admin, pedido)
    orden = _orden(client_admin, pedido, 0)
    assert _cancelar(client_admin, pedido, 0).status_code == 200
    _orden_estado(client_admin, orden, "FINALIZADA")
    assert _saldo(client_admin, tienda["vestido"])["current_stock"] == 1
    assert not _eventos(session, TipoEvento.CANCELADA_TERMINADA)


def test_cancelar_libera_lo_apartado_y_la_prenda_queda_tachada(client_admin, tienda, session):
    _hay(session, tienda["vestido"], 1)
    pedido = _pedido(client_admin, (tienda["vestido"], 1), BOLERO)
    _confirmar(client_admin, pedido)
    assert _saldo(client_admin, tienda["vestido"])["apartado"] == 1

    res = _cancelar(client_admin, pedido, 0)
    assert res.status_code == 200, res.text
    vestido, bolero = res.json()["items"]
    assert vestido["cancelada_en"] is not None and bolero["cancelada_en"] is None
    assert _saldo(client_admin, tienda["vestido"])["apartado"] == 0
    # Lo que falta ya no incluye la cancelada.
    assert res.json()["produccion"]["falta"] == ["Bolero tejido (M): por hacer en el taller"]
    [evento] = _eventos(session, TipoEvento.PRENDA_CANCELADA)
    assert evento.datos == {"prenda": "Vestido Noemi (M)", "cantidad": 1, "destino": None}


def test_lo_del_catalogo_ya_hecho_entra_a_bodega(client_admin, tienda, session):
    pedido = _pedido(client_admin, (tienda["vestido"], 2))
    _confirmar(client_admin, pedido)  # no hay en bodega: al taller
    _hechas(session, pedido, 0)

    assert _cancelar(client_admin, pedido, 0).status_code == 200
    entrada = session.exec(select(StockMovement).where(StockMovement.reference_id == pedido["items"][0]["id"])).one()
    assert (entrada.type, entrada.quantity) == (MovementType.RECEIPT, 2)
    assert _saldo(client_admin, tienda["vestido"])["disponible"] == 2


def test_lo_personalizado_ya_hecho_queda_en_piezas_unicas_una_por_unidad(client_admin, tienda, session):
    pedido = _pedido(client_admin, {**BOLERO, "cantidad": 2})
    _confirmar(client_admin, pedido)
    _hechas(session, pedido, 0)
    _cancelar(client_admin, pedido, 0)

    piezas = client_admin.get("/api/v1/admin/piezas-unicas/").json()
    assert [(p["nombre"], p["config"], p["estado"], p["origen_pedido_numero"]) for p in piezas] == [
        ("Bolero tejido", {"TALLA": "M"}, "DISPONIBLE", pedido["numero"])] * 2


def test_si_estaba_en_una_orden_sin_terminar_va_a_su_lugar_al_terminarla(client_admin, tienda, session):
    pedido = _pedido(client_admin, BOLERO)
    _confirmar(client_admin, pedido)
    orden = _orden(client_admin, pedido, 0)

    _cancelar(client_admin, pedido, 0)
    assert _eventos(session, TipoEvento.PRENDA_CANCELADA)[0].datos["destino"] == "al_terminar"
    assert session.exec(select(PiezaUnica)).all() == []

    _orden_estado(client_admin, orden, "FINALIZADA")
    assert [p.estado for p in session.exec(select(PiezaUnica)).all()] == ["DISPONIBLE"]
    [terminada] = _eventos(session, TipoEvento.CANCELADA_TERMINADA)
    assert (terminada.datos["destino"], terminada.datos["orden"]) == ("piezas", orden["numero"])

    # Reabrirla la retira: la pieza no existe todavía.
    _orden_estado(client_admin, orden, "EN_PROCESO")
    [pieza] = session.exec(select(PiezaUnica)).all()
    session.refresh(pieza)
    assert pieza.estado == "BAJA" and "reabrió" in pieza.nota


def test_solo_se_cancela_en_un_pedido_confirmado(client_admin, tienda, session):
    pedido = _pedido(client_admin, (tienda["vestido"], 1))
    res = _cancelar(client_admin, pedido, 0)
    assert res.status_code == 409 and "quítala" in res.json()["detail"]

    _confirmar(client_admin, pedido)
    _hechas(session, pedido, 0)
    _pagar_todo(client_admin, pedido)
    _estado(client_admin, pedido, "DESPACHADA")
    assert _cancelar(client_admin, pedido, 0).status_code == 409


# --- Cancelar el pedido entero ----------------------------------------------

def test_cancelar_el_pedido_cancela_cada_prenda_con_su_regla(client_admin, tienda, session):
    pedido = _pedido(client_admin, (tienda["vestido"], 1), BOLERO, (tienda["vestido"], 1))
    _confirmar(client_admin, pedido)
    _hechas(session, pedido, 0, 1)  # el vestido y el bolero hechos; el último no

    assert _estado(client_admin, pedido, "CANCELADA").status_code == 200
    leido = _leer(client_admin, pedido)
    assert all(i["cancelada_en"] for i in leido["items"])
    assert _saldo(client_admin, tienda["vestido"])["current_stock"] == 1
    assert len(session.exec(select(PiezaUnica)).all()) == 1
    # Solo se anota lo que tenía algo hecho.
    assert [e.datos["destino"] for e in _eventos(session, TipoEvento.PRENDA_CANCELADA)] == ["bodega", "piezas"]

    # Reabrirlo no revive las prendas: se agregan de nuevo.
    assert _estado(client_admin, pedido, "EN_CONVERSACION").status_code == 200
    res = _confirmar(client_admin, pedido)
    assert res.status_code == 409 and "no tiene prendas" in res.json()["detail"]


# --- Piezas únicas ----------------------------------------------------------

def _pieza_disponible(client_admin, tienda, session):
    pedido = _pedido(client_admin, BOLERO, rut="33333333-3")
    _confirmar(client_admin, pedido)
    _hechas(session, pedido, 0)
    _cancelar(client_admin, pedido, 0)
    return client_admin.get("/api/v1/admin/piezas-unicas/").json()[0]


def test_una_pieza_asignada_sale_de_bodega_apartada_y_se_vende_al_despachar(client_admin, tienda, session):
    pieza = _pieza_disponible(client_admin, tienda, session)
    pedido = _pedido(client_admin, rut="44444444-4")
    res = client_admin.post(f"/api/v1/admin/piezas-unicas/{pieza['id']}/asignar",
                            json={"cotizacion_id": pedido["id"], "precio": 15000})
    assert res.status_code == 200, res.text
    [prenda] = res.json()["items"]
    assert (prenda["pieza_numero"], prenda["precio_unitario_estimado"]) == (pieza["numero"], 15000)

    # No se puede asignar dos veces.
    otra = _pedido(client_admin, rut="55555555-5")
    assert client_admin.post(f"/api/v1/admin/piezas-unicas/{pieza['id']}/asignar",
                             json={"cotizacion_id": otra["id"]}).status_code == 409

    pedido = _leer(client_admin, pedido)
    [p] = client_admin.post(f"{CRM}/cotizaciones/{pedido['id']}/propuesta", json={}).json()["prendas"]
    assert (p["opciones"], p["camino"], p["queda"], p["pieza_numero"]) == (["BODEGA"], "BODEGA", "APARTADA", pieza["numero"])
    assert _confirmar(client_admin, pedido).status_code == 200
    # Ya existe, pero alguien tiene que ir por ella: pasa por el taller.
    pedido = _leer(client_admin, pedido)
    assert _leer(client_admin, pedido)["produccion"]["listo"] is False
    [pendiente] = client_admin.get("/api/v1/ordenes-corte/pendientes").json()
    assert pendiente["buscar"] is True and pendiente["nombre_custom"]
    _orden_estado(client_admin, _orden(client_admin, pedido, 0), "FINALIZADA")
    assert _leer(client_admin, pedido)["produccion"]["listo"] is True

    _pagar_todo(client_admin, pedido)
    assert _estado(client_admin, pedido, "DESPACHADA").status_code == 200
    assert client_admin.get("/api/v1/admin/piezas-unicas/").json()[0]["estado"] == "VENDIDA"
    assert _estado(client_admin, pedido, "CONFIRMADA").status_code == 200
    assert client_admin.get("/api/v1/admin/piezas-unicas/").json()[0]["estado"] == "APARTADA"


def test_quitarla_o_cancelarla_la_deja_disponible(client_admin, tienda, session):
    pieza = _pieza_disponible(client_admin, tienda, session)
    pedido = _pedido(client_admin, rut="44444444-4")
    pedido = client_admin.post(f"/api/v1/admin/piezas-unicas/{pieza['id']}/asignar",
                               json={"cotizacion_id": pedido["id"]}).json()
    assert client_admin.delete(f"{CRM}/cotizaciones/{pedido['id']}/prendas/{pedido['items'][0]['id']}").status_code == 200
    assert client_admin.get("/api/v1/admin/piezas-unicas/").json()[0]["estado"] == "DISPONIBLE"

    pedido = client_admin.post(f"/api/v1/admin/piezas-unicas/{pieza['id']}/asignar",
                               json={"cotizacion_id": pedido["id"], "precio": 9000}).json()
    _confirmar(client_admin, pedido)
    _cancelar(client_admin, pedido, 0)
    assert client_admin.get("/api/v1/admin/piezas-unicas/").json()[0]["estado"] == "DISPONIBLE"


def test_dar_de_baja_pide_una_nota_y_solo_si_esta_disponible(client_admin, tienda, session):
    pieza = _pieza_disponible(client_admin, tienda, session)
    url = f"/api/v1/admin/piezas-unicas/{pieza['id']}/baja"
    assert client_admin.post(url, json={"nota": "  "}).status_code == 409
    res = client_admin.post(url, json={"nota": "Se regaló en la feria"})
    assert res.status_code == 200 and (res.json()["estado"], res.json()["nota"]) == ("BAJA", "Se regaló en la feria")
    assert client_admin.post(url, json={"nota": "otra vez"}).status_code == 409


def test_al_taller_no_llega_lo_cancelado(client_admin, tienda, session):
    pedido = _pedido(client_admin, BOLERO, {**BOLERO, "nombre_custom": "Chal"})
    _confirmar(client_admin, pedido)
    _cancelar(client_admin, pedido, 0)
    pendientes = client_admin.get("/api/v1/ordenes-corte/pendientes").json()
    assert [p["cotizacion_item_id"] for p in pendientes] == [pedido["items"][1]["id"]]


def test_la_historia_de_una_sola_accion_queda_en_el_orden_en_que_paso(client_admin, tienda, session):
    """Cancelar el pedido anota cada prenda y después el estado, todo en el mismo instante."""
    pedido = _pedido(client_admin, BOLERO, {**BOLERO, "nombre_custom": "Chal"}, {**BOLERO, "nombre_custom": "Faja"})
    _confirmar(client_admin, pedido)
    _hechas(session, pedido, 0, 1, 2)
    _estado(client_admin, pedido, "CANCELADA")

    historia = client_admin.get(f"{CRM}/cotizaciones/{pedido['id']}/historia").json()
    assert [e["tipo"] for e in historia[-4:]] == ["PRENDA_CANCELADA"] * 3 + ["ESTADO"]
    assert [e["datos"]["prenda"] for e in historia[-4:-1]] == ["Bolero tejido (M)", "Chal (M)", "Faja (M)"]

