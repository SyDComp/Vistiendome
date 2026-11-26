"""Leer y guardar ajustes del negocio. Sin fila guardada, vale el valor por defecto."""

from datetime import datetime, timezone
from typing import Any, Dict

from sqlmodel import Session

from ...models.ajustes import AjusteNegocio
from ...models.crm import Cotizacion
from ...models.listas import CanalPedido, MedioPago
from ...models.pagos import Pago
from .. import listas
from .registro import AJUSTES, CANALES_PEDIDO, MEDIOS_PAGO

# Listas que viven en sus tablas, con identidad (core/listas): su modelo y qué las usa.
EN_TABLAS = {
    CANALES_PEDIDO: (CanalPedido, Cotizacion, Cotizacion.canal_id),
    MEDIOS_PAGO: (MedioPago, Pago, Pago.medio_id),
}


def leer(db: Session, clave: str) -> Any:
    if clave in EN_TABLAS:
        return listas.nombres(db, EN_TABLAS[clave][0])
    fila = db.get(AjusteNegocio, clave)
    return fila.valor if fila is not None else AJUSTES[clave].defecto


def leer_todos(db: Session) -> Dict[str, Any]:
    todos = {clave: leer(db, clave) for clave in AJUSTES}
    # Cómo se llaman HOY los medios que el panel reconoce (el vuelto de la caja,
    # pagar con saldo a favor): el panel ya no los escribe en su código.
    for clave in ("efectivo", "a_favor"):
        medio = listas.por_clave(db, MedioPago, clave)
        todos[f"medio_{clave}"] = medio.nombre if medio is not None and medio.activo else None
    return todos


def guardar(db: Session, clave: str, valor: Any) -> Any:
    """Valida y guarda. KeyError si la clave no existe; ValueError si el valor no sirve."""
    if clave in EN_TABLAS:
        # El panel manda textos, o {origen, nombre} si renombró: se valida la lista de nombres.
        AJUSTES[clave].validar([v.get("nombre") if isinstance(v, dict) else v for v in (valor or [])])
        modelo, tabla, columna = EN_TABLAS[clave]
        listas.guardar(db, modelo, valor or [], listas.contar(db, tabla, columna))
        db.commit()
        return listas.nombres(db, modelo)
    limpio = AJUSTES[clave].validar(valor)
    fila = db.get(AjusteNegocio, clave)
    if fila is None:
        fila = AjusteNegocio(clave=clave)
    fila.valor = limpio
    fila.actualizado_at = datetime.now(timezone.utc)
    db.add(fila)
    db.commit()
    return limpio
