"""
Cuánto hay de un SKU, y qué no alcanza.

EL STOCK NO ES UN NÚMERO GUARDADO
Es la suma de los movimientos de ese SKU: una orden de corte terminada suma,
un pedido despachado resta, un ajuste manual hace lo que diga. Así queda el
rastro de por qué hay lo que hay. Los movimientos no se borran nunca: para
deshacer algo se agrega otro (ver core/movimientos.py).

QUÉ SE PERMITE
Este módulo solo responde preguntas: cuánto hay, qué falta para un despacho,
si un ajuste dejaría el saldo bajo cero. Quién decide qué hacer con la
respuesta es quien llama: hoy el despacho y el ajuste manual de Bodega se
niegan a dejar el saldo negativo.
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
