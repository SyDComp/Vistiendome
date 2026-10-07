"""
De lo que llega en un pedido, qué prenda es.

La regla vive en el servidor, no en el navegador: el navegador manda el
producto, lo elegido y lo propuesto; acá se decide si eso es una variante del
catálogo o una pieza personalizada de ese producto.

  · Con variante (el carrito): se completa su producto.
  · Con producto, sin nada propuesto, y lo elegido coincide TODO y EXACTO con
    una variante activa: es esa variante, con su precio vigente si nadie puso
    otro.
  · Con producto y algo distinto (un valor propuesto, una característica de
    más o de menos): pieza personalizada DE ESE producto, tal cual se pidió.
  · Sin producto ("Otra"): pieza escrita a mano.
"""

from typing import Dict, Optional

from sqlmodel import Session

from ...models.catalog import SKU, Product
from ..pricing import compute_effective_price
from . import precios


def _limpia(config: Optional[Dict]) -> Dict[str, str]:
    return {str(k): str(v) for k, v in (config or {}).items() if v not in (None, "")}


def variante_exacta(producto: Product, config: Optional[Dict]) -> Optional[SKU]:
    """La variante activa cuyas características son exactamente estas, o None."""
    buscada = _limpia(config)
    if not buscada:
        return None
    for sku in producto.skus:  # solo las activas
        if _limpia(sku.config) == buscada:
            return sku
    return None


def prenda_desde(session: Session, entrada, permitir_sin_costo: bool) -> Dict:
    """Los campos de CotizacionItem para lo que llegó en `entrada` (un CotizacionItemCreate)."""
    sin_costo = permitir_sin_costo and getattr(entrada, "sin_costo", False)
    campos = {
        "sku_id": entrada.sku_id,
        "producto_id": None,
        "cantidad": entrada.cantidad,
        "precio_unitario_estimado": precios.normalizar(entrada.precio_unitario_estimado, sin_costo),
        "nombre_custom": entrada.nombre_custom,
        "config_custom": entrada.config_custom or None,
        "config_propuesta": entrada.config_propuesta or None,
    }

    sku = session.get(SKU, entrada.sku_id) if entrada.sku_id else None
    if sku is not None:
        campos["producto_id"] = sku.product_id
        return campos

    producto = session.get(Product, entrada.producto_id) if getattr(entrada, "producto_id", None) else None
    if producto is None or producto.is_deleted:
        return campos
    campos["producto_id"] = producto.id

    if entrada.config_propuesta:
        return campos
    exacta = variante_exacta(producto, entrada.config_custom)
    if exacta is None:
        return campos

    campos.update(sku_id=exacta.id, nombre_custom=None, config_custom=None)
    if campos["precio_unitario_estimado"] is None and not sin_costo:
        vigente, _, _ = compute_effective_price(exacta, producto)  # con la hora de Chile, como el catálogo
        campos["precio_unitario_estimado"] = precios.normalizar(vigente)
    return campos
