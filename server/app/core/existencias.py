"""
Cuánto hay de un SKU, y la regla que impide que quede debiendo.

EL STOCK NO ES UN NÚMERO GUARDADO
Es la suma de los movimientos de ese SKU: una orden de corte terminada suma,
un pedido despachado resta, un ajuste manual hace lo que diga. Eso está bien
—queda el rastro de por qué hay lo que hay— pero tiene una consecuencia que
nadie había puesto: si se resta más de lo que se sumó, la suma queda negativa
y el sistema lo acepta sin decir nada.

Así aparecieron los "-1 und." en el catálogo: se despachó una prenda que nunca
se registró como entrada. Un -1 no es un estado del inventario; es un error de
registro que ya ocurrió, y en la pantalla parece un dato más.

LA REGLA
Ningún movimiento puede dejar el stock bajo cero. Se comprueba ANTES de
guardarlo y, si no alcanza, se rechaza diciendo cuánto hay y cuánto falta.
Quien de verdad tiene la prenda registra su entrada —la orden de corte o un
ajuste— y vuelve a despachar.

POR QUE NO SE CORRIGE SOLO
Un -1 que ya existe significa que una prenda real salió sin registrarse.
Ponerlo en cero de oficio borraría esa evidencia. Se deja que se vea, y se
impide que aparezcan nuevos.
"""

from typing import Dict, Iterable, List, Tuple

from sqlmodel import Session, select

from ..models.catalog import StockMovement


def existencias(db: Session, sku_id: int) -> int:
    """Lo que hay de ese SKU: la suma de todos sus movimientos."""
    movimientos = db.exec(
        select(StockMovement).where(StockMovement.sku_id == sku_id)
    ).all()
    return sum(m.quantity for m in movimientos)


def existencias_de(db: Session, sku_ids: Iterable[int]) -> Dict[int, int]:
    """
    Lo que hay de varios SKU a la vez.

    En una consulta y no una por ítem: un pedido de veinte prendas haría veinte
    viajes a la base para responder lo mismo.
    """
    ids = {i for i in sku_ids if i}
    if not ids:
        return {}
    movimientos = db.exec(
        select(StockMovement).where(StockMovement.sku_id.in_(ids))
    ).all()
    total: Dict[int, int] = {i: 0 for i in ids}
    for m in movimientos:
        total[m.sku_id] = total.get(m.sku_id, 0) + m.quantity
    return total


def faltantes(db: Session, pedidos: Dict[int, int]) -> List[Tuple[int, int, int]]:
    """
    Qué no alcanza para lo que se pide.

    `pedidos` es {sku_id: cantidad a sacar}. Devuelve una lista de
    (sku_id, hay, se_pide) por cada uno que no alcance; vacía si alcanza todo.

    Se devuelven TODOS los que faltan, no el primero: quien despacha necesita
    saber de una vez todo lo que le falta, no descubrirlo de a uno.
    """
    disponibles = existencias_de(db, pedidos.keys())
    problemas = []
    for sku_id, cantidad in pedidos.items():
        if cantidad <= 0:
            continue
        hay = disponibles.get(sku_id, 0)
        if hay < cantidad:
            problemas.append((sku_id, hay, cantidad))
    return problemas


def deja_negativo(db: Session, sku_id: int, delta: int) -> Tuple[bool, int]:
    """
    ¿Este movimiento dejaría el stock bajo cero? Devuelve (sí/no, lo que hay).

    Los movimientos que SUMAN nunca se bloquean: es justamente como se corrige
    un stock que ya quedó negativo.
    """
    if delta >= 0:
        return (False, existencias(db, sku_id))
    hay = existencias(db, sku_id)
    return (hay + delta < 0, hay)


def huerfanos(db: Session) -> List[StockMovement]:
    """
    Movimientos cuyo motivo ya no existe.

    Una venta se justifica con el ítem de pedido que la produjo
    (`reference_id`). Si ese ítem se borró —se anuló el pedido, se quitó la
    prenda— el movimiento se quedó sin razón de ser: sigue restando stock por
    algo que ya nadie puede consultar.

    Solo se miran las VENTAS: un ingreso o un ajuste no apuntan a un ítem de
    pedido, así que no tener referencia es lo normal en ellos.
    """
    from ..models.crm import CotizacionItem
    from ..models.catalog import MovementType

    ventas = db.exec(
        select(StockMovement).where(StockMovement.type == MovementType.SALE)
    ).all()
    con_referencia = [m for m in ventas if m.reference_id]
    if not con_referencia:
        return []

    ids = {m.reference_id for m in con_referencia}
    vivos = {
        i.id for i in db.exec(
            select(CotizacionItem).where(CotizacionItem.id.in_(ids))
        ).all()
    }
    return [m for m in con_referencia if m.reference_id not in vivos]


def reparar(db: Session) -> Dict[str, object]:
    """
    Deja el inventario consistente y explica qué hizo.

    DOS COSAS, EN ESTE ORDEN
    1. Se borran los movimientos huérfanos: restan por un pedido que ya no
       existe. Mientras estén, el total está mal y volver a calcularlo no
       arregla nada.
    2. Lo que siga negativo se lleva a cero con un movimiento de AJUSTE que lo
       compensa.

    POR QUE UN AJUSTE Y NO UN `UPDATE`
    Cambiar el número a mano borraría que la inconsistencia existió. Un ajuste
    con su nota deja el inventario correcto Y el rastro de que hubo que
    corregirlo: quien mire el historial de ese SKU ve la venta sin respaldo y,
    debajo, la corrección. Es lo mismo que hace una contabilidad: no se borra
    un asiento, se hace el contrario.

    Es idempotente: correrlo dos veces no crea un segundo ajuste, porque la
    segunda vez ya no hay nada en negativo.
    """
    from ..models.catalog import MovementType

    sueltos = huerfanos(db)
    for m in sueltos:
        db.delete(m)
    if sueltos:
        db.flush()

    movimientos = db.exec(select(StockMovement)).all()
    total: Dict[int, int] = {}
    for m in movimientos:
        total[m.sku_id] = total.get(m.sku_id, 0) + m.quantity

    corregidos = []
    for sku_id, hay in total.items():
        if hay >= 0:
            continue
        db.add(StockMovement(
            sku_id=sku_id,
            type=MovementType.ADJUSTMENT,
            quantity=-hay,
            note=(
                f"Corrección automática: el stock estaba en {hay} por salidas "
                "sin su entrada registrada. Se lleva a 0."
            ),
        ))
        corregidos.append({"sku_id": sku_id, "estaba_en": hay})

    return {
        "huerfanos_borrados": len(sueltos),
        "skus_corregidos": corregidos,
    }
