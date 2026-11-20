"""
El arqueo del cajón: con cuánto partió, cuánto debería haber y cuánto había.
"""

ARQUEO = "/api/v1/crm/venta-local/arqueo"


def test_sin_fondo_propone_lo_que_se_dejo_el_dia_anterior(client_admin):
    assert client_admin.put(f"{ARQUEO}/2026-11-19/fondo", json={"monto": 20000}).status_code == 200
    r = client_admin.put(f"{ARQUEO}/2026-11-19/cierre", json={"contado": 55000, "deja": 30000, "nota": "Retiro a banco"})
    assert r.status_code == 200, r.text
    assert (r.json()["contado"], r.json()["deja"], r.json()["diferencia"]) == (55000, 30000, 35000)

    hoy = client_admin.get(ARQUEO, params={"fecha": "2026-11-20"}).json()
    assert (hoy["fondo_inicial"], hoy["fondo_propuesto"], hoy["deberia"]) == (None, 30000, None)


def test_deberia_es_el_fondo_mas_el_efectivo_del_dia_y_la_diferencia_lo_contado(client_admin):
    client_admin.put(f"{ARQUEO}/2026-11-20/fondo", json={"monto": 10000})
    r = client_admin.put(f"{ARQUEO}/2026-11-20/cierre", json={"contado": 9000}).json()
    # Sin ventas ese día: debería haber el fondo; falta 1000. Sin decir, se deja todo lo contado.
    assert (r["efectivo_del_dia"], r["deberia"], r["diferencia"], r["deja"]) == (None, 10000, -1000, 9000)
    assert r["cerrado_por"]


def test_no_se_cierra_sin_fondo_ni_se_deja_mas_de_lo_contado(client_admin):
    r = client_admin.put(f"{ARQUEO}/2026-11-21/cierre", json={"contado": 5000})
    assert r.status_code == 409 and "partió" in r.json()["detail"]
    client_admin.put(f"{ARQUEO}/2026-11-21/fondo", json={"monto": 0})
    r = client_admin.put(f"{ARQUEO}/2026-11-21/cierre", json={"contado": 5000, "deja": 6000})
    assert r.status_code == 409
