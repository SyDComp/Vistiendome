"""
Cotizar una prenda: ponerle precio, cambiarlo, dejarla sin costo o volverla a
"por cotizar".

Solo mientras el pedido no está confirmado: confirmar es aceptar el precio, y
desde ahí ya no se cambia por esta vía. Cada cambio queda en la historia.
"""

from typing import Dict, Optional

from sqlmodel import Session
from sqlalchemy.orm import object_session

from ...models.crm import Cotizacion, CotizacionItem, EstadoCotizacion
from ...models.historia import TipoEvento
from .. import caracteristicas
from . import precios
from .historia import Actor, anotar

ESTADOS_QUE_SE_COTIZAN = {EstadoCotizacion.NUEVA, EstadoCotizacion.EN_CONVERSACION}


class NoSeCotiza(Exception):
    """El pedido ya no está en conversación: su precio no se cambia por acá."""


def nombre_de_prenda(item: CotizacionItem) -> str:
    """
    Cómo se nombra la prenda en la historia: lo bastante para reconocerla.

    Con sus características: un pedido puede tener tres "Tapado Magdalena
    Verano" que solo se distinguen por la talla, y la historia tiene que decir
    cuál se cotizó.
    """
    if item.sku is not None:
        base = item.sku.product.name if item.sku.product else item.sku.sku
        config = item.sku.config
    else:
        base = item.producto.name if item.producto is not None else (item.nombre_custom or "Pieza especial")
        config = {**(item.config_custom or {}), **(item.config_propuesta or {})}
    orden = _orden_de_la_tienda(object_session(item))
    claves = sorted((k for k, v in (config or {}).items() if v),
                    key=lambda k: (orden.get(str(k).upper(), len(orden)), str(k).upper()))
    valores = [str(config[k]) for k in claves]
    return f"{base} ({' / '.join(valores)})" if valores else base


def _orden_de_la_tienda(db: Optional[Session]) -> Dict[str, int]:
    """
    Las características en el orden de la tienda, para que todas las prendas
    digan sus valores igual (antes salían como venían: "Azul Rey / Bajo
    Rodilla / 2XL" y "Azul Marino / S / Midi"). Se lee una vez por sesión.
    """
    if db is None:
        return {}
    if "orden_caracteristicas" not in db.info:
        db.info["orden_caracteristicas"] = {
            c.name.strip().upper(): i for i, c in enumerate(caracteristicas.en_orden(db))
        }
    return db.info["orden_caracteristicas"]


def cotizar(
    db: Session,
    cotizacion: Cotizacion,
    item: CotizacionItem,
    precio: Optional[float],
    sin_costo: bool,
    actor: Actor,
) -> Optional[float]:
    """Deja el precio y lo anota. Devuelve el precio guardado. No hace commit."""
    estado = EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado))
    if estado not in ESTADOS_QUE_SE_COTIZAN or item.cancelada_en is not None:
        raise NoSeCotiza()

    nuevo = precios.normalizar(precio, sin_costo)
    anterior = item.precio_unitario_estimado
    if nuevo == anterior:
        return nuevo

    anotar(db, cotizacion, TipoEvento.PRECIO, actor, prenda=nombre_de_prenda(item), de=anterior, a=nuevo)
    item.precio_unitario_estimado = nuevo
    db.add(item)
    return nuevo
