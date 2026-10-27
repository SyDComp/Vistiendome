"""
El conteo de inventario: se cuenta lo que hay físicamente y se anota, por cada
variante, un ajuste por la diferencia. Se cuenta "en bodega" (lo apartado para
pedidos también está ahí), no "disponible".

Contra ventas simultáneas: cada fila trae cuánto había cuando se abrió el
conteo (`esperado`). Si la bodega ya no tiene eso —se vendió o entró algo
mientras se contaba— el lote completo se rechaza con el valor de ahora: un
conteo no puede borrar una venta.
"""

from dataclasses import dataclass
from typing import Iterable, List

from sqlmodel import Session

from ...models.catalog import MovementType, StockMovement
from ..existencias import existencias_de
from .rechazo import LoteInvalido, LoteRechazado
from .referencia import nueva_referencia
from .validar import variantes_del_lote


@dataclass
class Contada:
    sku_id: int
    esperado: int   # lo que había en bodega cuando se abrió el conteo
    contado: int    # lo que se contó


def ajustar_a_conteo(db: Session, filas: Iterable[Contada], motivo: str) -> List[StockMovement]:
    """Agrega los ajustes a la sesión (sin confirmarla) y los devuelve; sin diferencias, ninguno."""
    filas = list(filas)
    variantes_del_lote(db, [f.sku_id for f in filas], motivo)
    negativas = [f.sku_id for f in filas if f.contado < 0]
    if negativas:
        raise LoteInvalido(f"No se puede contar menos que cero (variantes {negativas}).")

    hay = existencias_de(db, [f.sku_id for f in filas])
    cambiaron = [
        {"sku_id": f.sku_id, "esperado": f.esperado, "ahora": hay.get(f.sku_id, 0)}
        for f in filas if hay.get(f.sku_id, 0) != f.esperado
    ]
    if cambiaron:
        raise LoteRechazado(
            f"Mientras se contaba cambió la bodega de {len(cambiaron)} variante(s). Revisa sus valores y confirma de nuevo.",
            cambiaron,
        )

    referencia = nueva_referencia()
    movimientos = [
        StockMovement(
            sku_id=f.sku_id, type=MovementType.ADJUSTMENT, quantity=f.contado - f.esperado,
            reference_id=referencia, note=f"Conteo: había {f.esperado}, se contaron {f.contado}. {motivo.strip()}",
        )
        for f in filas if f.contado != f.esperado
    ]
    db.add_all(movimientos)
    return movimientos
