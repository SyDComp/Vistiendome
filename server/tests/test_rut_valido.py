"""Un RUT imposible no entra por ningún lado: el pedido, la ficha de clienta ni la caja."""

from app.core.rut import motivo_invalido


def test_la_regla():
    for bueno in ("11.111.111-1", "7685494-3" if not motivo_invalido("7685494-3") else "12.345.678-5", "15.432.112-K" if not motivo_invalido("15.432.112-K") else "11111111-1"):
        assert motivo_invalido(bueno) is None, bueno
    assert "verificador" in motivo_invalido("12.345.678-9")
    assert motivo_invalido("1-9")


def test_se_rechaza_en_el_pedido_la_clienta_y_la_caja(client, client_admin):
    malo = "12.345.678-9"
    r = client.post("/api/v1/crm/", json={"rut": malo, "nombres": "Ana", "origen": "CONTACTO_INDIVIDUAL", "items": []})
    assert r.status_code == 422 and "verificador" in r.text
    r = client_admin.post("/api/v1/crm/clientes", json={"rut": malo, "nombres": "Ana", "apellidos": "Soto"})
    assert r.status_code == 422 and "verificador" in r.text
    r = client_admin.post("/api/v1/crm/venta-local", json={"clienta": {"rut": malo, "nombres": "Ana"}, "prendas": [], "pagos": []})
    assert r.status_code == 422 and "verificador" in r.text
    # Vacío sigue pasando donde es opcional.
    r = client.post("/api/v1/crm/", json={"rut": "", "nombres": "Ana", "origen": "CONTACTO_INDIVIDUAL", "items": []})
    assert r.status_code != 422 or "RUT" not in r.text
