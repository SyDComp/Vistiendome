"""
Sumar o restar la misma cantidad a varias variantes: llegó mercadería, o sale
una partida dañada. Un movimiento por variante, todos con la misma referencia.

Una merma que dejaría alguna bajo cero rechaza el lote completo: restar más de
lo que hay no es un ajuste, es un error de registro (la misma regla que el
movimiento de una variante en Bodega).
"""

from typing import Iterable, List

from sqlmodel import Session

from ...models.catalog import MovementType, StockMovement
from ..existencias import existencias_de
from .rechazo import LoteInvalido, LoteRechazado
from .referencia import nueva_referencia
from .validar import variantes_del_lote

TIPOS = {
    "ingreso": (MovementType.RECEIPT, 1),
    "merma": (MovementType.ADJUSTMENT, -1),
}


def sumar_a_todas(db: Session, sku_ids: Iterable[int], tipo: str, cantidad: int, motivo: str) -> List[StockMovement]:
    """Agrega los movimientos a la sesión (sin confirmarla) y los devuelve."""
    ids = variantes_del_lote(db, sku_ids, motivo)
    if tipo not in TIPOS:
        raise LoteInvalido(f"Tipo de movimiento no válido: '{tipo}'. Es 'ingreso' o 'merma'.")
    if not isinstance(cantidad, int) or cantidad <= 0:
        raise LoteInvalido("La cantidad tiene que ser un entero mayor que cero.")

    tipo_movimiento, signo = TIPOS[tipo]
    delta = signo * cantidad
    hay = existencias_de(db, ids)
    bajo_cero = [{"sku_id": i, "hay": hay.get(i, 0)} for i in ids if hay.get(i, 0) + delta < 0]
    if bajo_cero:
        raise LoteRechazado(
            f"No alcanza para restar {cantidad} en {len(bajo_cero)} variante(s): quedarían bajo cero.",
            bajo_cero,
        )

    referencia = nueva_referencia()
    movimientos = [
        StockMovement(sku_id=i, type=tipo_movimiento, quantity=delta, reference_id=referencia, note=motivo.strip())
        for i in ids
    ]
    db.add_all(movimientos)
    return movimientos
