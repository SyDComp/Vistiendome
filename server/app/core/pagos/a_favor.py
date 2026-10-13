"""
El saldo a favor de una clienta: lo que pagó de más en un pedido y dejó para
otra compra.

No es otra tabla: es el mismo libro de pagos. Dejar algo a favor es un
movimiento A_FAVOR que lo saca de un pedido; usarlo es un pago con el medio
"Saldo a favor" en otro pedido de la misma clienta. Lo disponible se calcula,
como el stock: nada que pueda quedar desfasado.
"""

from sqlmodel import Session, select

from ...models.crm import Cotizacion
from ...models.pagos import Pago, TipoPago

# El medio con que se paga usando el saldo a favor. No está en la lista de
# Ajustes: aparece solo cuando la clienta tiene saldo.
MEDIO_A_FAVOR = "Saldo a favor"


def disponible(db: Session, persona_id: str) -> int:
    """Lo que la clienta tiene a favor: lo dejado menos lo usado, sin anulados."""
    # Una venta sin datos no tiene clienta: sin esto, "sin clienta" juntaría
    # el saldo de todas las ventas anónimas.
    if not persona_id:
        return 0
    filas = db.exec(
        select(Pago)
        .join(Cotizacion, Pago.cotizacion_id == Cotizacion.id)
        .where(Cotizacion.persona_id == persona_id, Pago.anulado_en.is_(None))
    ).all()
    dejado = sum(p.monto for p in filas if p.tipo == TipoPago.A_FAVOR)
    usado = sum(p.monto for p in filas if p.tipo == TipoPago.PAGO and p.medio == MEDIO_A_FAVOR)
    return dejado - usado
