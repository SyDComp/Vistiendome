"""
Canales, medios de pago y métodos de envío tienen identidad: renombrar se ve
en lo ya registrado, quitar uno usado lo desactiva, y lo que el sistema
reconoce (el canal del local, el efectivo, el saldo a favor) se reconoce por su
clave, no por su nombre.
"""

from datetime import date

from sqlmodel import select

from app.models.crm import Cotizacion
from app.models.listas import MedioPago
from test_ciclo_pedido import _hay, tienda  # noqa: F401  (tienda es fixture)
from test_venta_local import _vender

AJUSTES = "/api/v1/ajustes-negocio"
CIERRE = "/api/v1/crm/venta-local/cierre"


def _medios(client_admin):
    return client_admin.get(AJUSTES).json()["medios_pago"]


def _renombrar(client_admin, clave, lista, de, a):
    """Como lo manda el editor del panel: cada opción con su nombre de antes."""
    valor = [{"origen": o, "nombre": a if o == de else o} for o in lista]
    res = client_admin.put(f"{AJUSTES}/{clave}", json={"valor": valor})
    assert res.status_code == 200, res.text
    return res.json()["valor"]


def _venta(client_admin, session, tienda, medio="Efectivo"):
    _hay(session, tienda["cinturon"], 5)
    res = _vender(client_admin, [{"sku_id": tienda["cinturon"].id, "cantidad": 1, "precio": 9000}],
                  [{"monto": 9000, "medio": medio}])
    assert res.status_code == 200, res.text
    return res.json()


def test_renombrar_un_medio_se_ve_en_los_pagos_de_antes(client_admin, session, tienda):
    pedido = _venta(client_admin, session, tienda, "Débito")
    _renombrar(client_admin, "medios_pago", _medios(client_admin), "Débito", "Tarjeta de débito")
    pagos = client_admin.get(f"/api/v1/crm/cotizaciones/{pedido['id']}/pagos").json()["pagos"]
    assert [p["medio"] for p in pagos] == ["Tarjeta de débito"]
    # El cierre los cuenta juntos: un solo medio, no "Débito" y "Tarjeta de débito".
    cierre = client_admin.get(CIERRE, params={"fecha": date.today().isoformat()}).json()
    assert [m["medio"] for m in cierre["por_medio"]] == ["Tarjeta de débito"]


def test_quitar_un_medio_usado_lo_desactiva_y_los_pagos_lo_siguen_diciendo(client_admin, session, tienda):
    pedido = _venta(client_admin, session, tienda, "Transferencia")
    sin = [m for m in _medios(client_admin) if m != "Transferencia"]
    assert client_admin.put(f"{AJUSTES}/medios_pago", json={"valor": sin}).status_code == 200
    assert "Transferencia" not in _medios(client_admin)
    pagos = client_admin.get(f"/api/v1/crm/cotizaciones/{pedido['id']}/pagos").json()["pagos"]
    assert [p["medio"] for p in pagos] == ["Transferencia"]
    assert session.exec(select(MedioPago).where(MedioPago.nombre == "Transferencia")).one().activo is False


def test_el_efectivo_se_reconoce_aunque_se_renombre(client_admin, session, tienda):
    _renombrar(client_admin, "medios_pago", _medios(client_admin), "Efectivo", "Plata")
    assert client_admin.get(AJUSTES).json()["medio_efectivo"] == "Plata"
    _venta(client_admin, session, tienda, "Plata")
    cierre = client_admin.get(CIERRE, params={"fecha": date.today().isoformat()}).json()
    assert cierre["efectivo_en_cajon"] is not None
    assert cierre["por_medio"][0]["medio"] == "Plata"


def test_las_ventas_del_local_se_cuentan_aunque_se_renombre_su_canal(client_admin, session, tienda):
    canales = client_admin.get(AJUSTES).json()["canales_pedido"]
    _renombrar(client_admin, "canales_pedido", canales, "En la tienda", "Local de San Carlos")
    pedido = _venta(client_admin, session, tienda)
    assert pedido["canal"] == "Local de San Carlos"
    cierre = client_admin.get(CIERRE, params={"fecha": date.today().isoformat()}).json()
    assert [v["numero"] for v in cierre["ventas_caja"]] == [pedido["numero"]]


def test_el_pedido_guarda_la_comuna_y_la_region_es_la_suya(client, session):
    from app.models.geo import Comuna, Region
    region = Region(nombre="Ñuble")
    session.add(region)
    session.commit()
    comuna = Comuna(nombre="San Carlos", region_id=region.id)
    session.add(comuna)
    session.commit()
    res = client.post("/api/v1/crm/", json={
        "rut": "11111111-1", "nombres": "Ana", "origen": "CONTACTO_INDIVIDUAL", "modo_entrega": "DESPACHO",
        "transporte": "STARKEN", "tipo_despacho": "SUCURSAL", "comuna_id": comuna.id,
        "region": "texto que no importa", "comuna": "San Carlos", "items": [{"nombre_custom": "Tapado"}],
    })
    assert res.status_code == 200, res.text
    cot = session.exec(select(Cotizacion)).one()
    assert (cot.comuna_id, cot.comuna, cot.region, cot.transporte) == (comuna.id, "San Carlos", "Ñuble", "STARKEN")


def test_un_metodo_de_envio_que_no_existe_se_rechaza(client, session):
    res = client.post("/api/v1/crm/", json={
        "rut": "11111111-1", "nombres": "Ana", "origen": "CONTACTO_INDIVIDUAL", "modo_entrega": "DESPACHO",
        "transporte": "CHILEXPRESS", "tipo_despacho": "SUCURSAL", "items": [{"nombre_custom": "Tapado"}],
    })
    assert res.status_code == 422 and "CHILEXPRESS" in res.text
