"""
Movimientos de bodega en bloque (docs/diseno/bodega_en_bloque.md): sumar o
restar a varias variantes, y el conteo de inventario. Todo o nada.
"""

import pytest
from sqlmodel import Session, select

from app.core.existencias import existencias_de
from app.models.catalog import Category, MovementType, Product, SKU, StockMovement

SUMAR = "/api/v1/admin/catalog/kardex/lote/sumar"
CONTEO = "/api/v1/admin/catalog/kardex/lote/conteo"


@pytest.fixture
def variantes(session: Session):
    cat = Category(name="Vestimenta", slug="vestimenta")
    session.add(cat)
    session.commit()
    p = Product(name="Vestido Noemi", slug="vestido-noemi", description="", category_id=cat.id)
    session.add(p)
    session.commit()
    skus = [SKU(product_id=p.id, sku=f"NOE-{t}", price=16900, config={"TALLA": t}) for t in ("M", "L", "XL")]
    session.add_all(skus)
    session.commit()
    for s, hay in zip(skus, (5, 2, 0)):
        if hay:
            session.add(StockMovement(sku_id=s.id, type=MovementType.RECEIPT, quantity=hay, note="Carga"))
    session.commit()
    return [s.id for s in skus]


def _movimientos(session: Session):
    return session.exec(select(StockMovement).where(StockMovement.note != "Carga")).all()


def test_un_ingreso_suma_a_todas_con_una_sola_referencia(client_admin, session, variantes):
    r = client_admin.post(SUMAR, json={"sku_ids": variantes, "tipo": "ingreso", "cantidad": 3, "motivo": "Llegó mercadería"})
    assert r.status_code == 200 and r.json()["movimientos"] == 3
    assert existencias_de(session, variantes) == {variantes[0]: 8, variantes[1]: 5, variantes[2]: 3}
    nuevos = _movimientos(session)
    assert {m.reference_id for m in nuevos} == {r.json()["referencia"]}
    assert all(m.type == MovementType.RECEIPT for m in nuevos)


def test_una_merma_que_deja_alguna_bajo_cero_no_escribe_ninguna(client_admin, session, variantes):
    r = client_admin.post(SUMAR, json={"sku_ids": variantes, "tipo": "merma", "cantidad": 2, "motivo": "Falla de tela"})
    assert r.status_code == 409
    assert r.json()["detail"]["filas"] == [{"sku_id": variantes[2], "hay": 0}]
    assert _movimientos(session) == []


def test_una_merma_que_alcanza_resta_a_todas(client_admin, session, variantes):
    r = client_admin.post(SUMAR, json={"sku_ids": variantes[:2], "tipo": "merma", "cantidad": 2, "motivo": "Falla de tela"})
    assert r.status_code == 200
    assert existencias_de(session, variantes[:2]) == {variantes[0]: 3, variantes[1]: 0}


def test_el_conteo_ajusta_solo_lo_que_cambio(client_admin, session, variantes):
    filas = [{"sku_id": variantes[0], "esperado": 5, "contado": 4},
             {"sku_id": variantes[1], "esperado": 2, "contado": 2},
             {"sku_id": variantes[2], "esperado": 0, "contado": 1}]
    r = client_admin.post(CONTEO, json={"filas": filas, "motivo": "Inventario de octubre"})
    assert r.status_code == 200 and r.json()["movimientos"] == 2
    assert existencias_de(session, variantes) == {variantes[0]: 4, variantes[1]: 2, variantes[2]: 1}
    notas = sorted(m.note for m in _movimientos(session))
    assert notas[0].startswith("Conteo: había 0, se contaron 1.")


def test_una_venta_durante_el_conteo_lo_rechaza_entero(client_admin, session, variantes):
    session.add(StockMovement(sku_id=variantes[0], type=MovementType.SALE, quantity=-1, note="Venta"))
    session.commit()
    filas = [{"sku_id": variantes[0], "esperado": 5, "contado": 5},
             {"sku_id": variantes[1], "esperado": 2, "contado": 1}]
    r = client_admin.post(CONTEO, json={"filas": filas, "motivo": "Inventario"})
    assert r.status_code == 409
    assert r.json()["detail"]["filas"] == [{"sku_id": variantes[0], "esperado": 5, "ahora": 4}]
    assert existencias_de(session, variantes[:2]) == {variantes[0]: 4, variantes[1]: 2}


@pytest.mark.parametrize("ruta, cuerpo", [
    (SUMAR, {"sku_ids": [], "tipo": "ingreso", "cantidad": 1, "motivo": "x"}),
    (SUMAR, {"sku_ids": None, "tipo": "ingreso", "cantidad": 1, "motivo": " "}),
    (SUMAR, {"sku_ids": None, "tipo": "regalo", "cantidad": 1, "motivo": "x"}),
    (SUMAR, {"sku_ids": None, "tipo": "ingreso", "cantidad": 0, "motivo": "x"}),
    (CONTEO, {"filas": "negativa", "motivo": "x"}),
])
def test_un_lote_mal_pedido_se_rechaza_sin_escribir(client_admin, session, variantes, ruta, cuerpo):
    if cuerpo.get("sku_ids") is None and "sku_ids" in cuerpo:
        cuerpo["sku_ids"] = variantes
    if cuerpo.get("filas") == "negativa":
        cuerpo["filas"] = [{"sku_id": variantes[0], "esperado": 5, "contado": -1}]
    r = client_admin.post(ruta, json=cuerpo)
    assert r.status_code == 400
    assert _movimientos(session) == []


def test_variantes_repetidas_o_dadas_de_baja_no_entran(client_admin, session, variantes):
    r = client_admin.post(SUMAR, json={"sku_ids": [variantes[0], variantes[0]], "tipo": "ingreso", "cantidad": 1, "motivo": "x"})
    assert r.status_code == 400
    baja = session.get(SKU, variantes[1])
    baja.is_deleted = True
    session.add(baja)
    session.commit()
    r = client_admin.post(SUMAR, json={"sku_ids": variantes, "tipo": "ingreso", "cantidad": 1, "motivo": "x"})
    assert r.status_code == 400 and "dadas de baja" in r.json()["detail"]
    assert _movimientos(session) == []
