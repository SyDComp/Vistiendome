"""
El orden en que se muestran las características lo decide la tienda,
incluidas las del sistema. Una nueva va al final.
"""

ATRIBUTOS = "/api/v1/admin/catalog/attributes"


def _nombres(client_admin):
    return [a["name"] for a in client_admin.get(ATRIBUTOS).json()]


def test_se_listan_en_su_orden_y_una_nueva_va_al_final(client_admin):
    antes = _nombres(client_admin)   # siembra Talla, Color y Estampado
    client_admin.post(ATRIBUTOS, json={"name": "cuello", "domain": [{"value": "en v"}]})
    assert _nombres(client_admin) == antes + ["CUELLO"]


def test_se_reordenan_todas_incluidas_las_del_sistema(client_admin):
    client_admin.get(ATRIBUTOS)
    client_admin.post(ATRIBUTOS, json={"name": "cuello", "domain": []})
    ids = [a["id"] for a in client_admin.get(ATRIBUTOS).json()]
    res = client_admin.post(f"{ATRIBUTOS}/orden", json={"ids": list(reversed(ids))})
    assert res.status_code == 200, res.text
    assert [a["id"] for a in client_admin.get(ATRIBUTOS).json()] == list(reversed(ids))
    # El panel reemplaza su lista con esta respuesta: tiene que venir completa,
    # igual que al listar. Antes llegaba [{}, {}, …] y la pantalla se iba a blanco.
    assert res.json() == client_admin.get(ATRIBUTOS).json()


def test_una_lista_a_medias_o_repetida_no_reordena(client_admin):
    ids = [a["id"] for a in client_admin.get(ATRIBUTOS).json()]
    for mala in (ids[:-1], ids + [ids[0]], ids[:-1] + [9999]):
        assert client_admin.post(f"{ATRIBUTOS}/orden", json={"ids": mala}).status_code == 422
    assert [a["id"] for a in client_admin.get(ATRIBUTOS).json()] == ids
