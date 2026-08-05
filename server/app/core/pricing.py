"""
Cálculo de precio efectivo con ofertas temporales.

Reglas (acordadas con el cliente):
- Oferta a nivel PRODUCTO: aplica a todas sus variantes.
- Oferta a nivel SKU: SOBRESCRIBE la del producto para esa variante.
- Cada oferta tiene un `sale_type`: 'percent' (sale_value = % 0-100) o
  'fixed' (sale_value = precio rebajado absoluto).
- Una oferta solo está vigente si `now` cae dentro de [start, end]. Si falta
  start y/o end, ese extremo se considera abierto (vigente).
"""
from datetime import datetime
from typing import Optional, Tuple
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


def get_chile_time() -> datetime:
    """Devuelve la fecha y hora actual en la zona horaria de Chile (Santiago) como datetime naive para comparar fielmente con inputs datetime-local."""
    if ZoneInfo is not None:
        try:
            return datetime.now(ZoneInfo("America/Santiago")).replace(tzinfo=None)
        except Exception:
            pass
    return datetime.utcnow()


def _within_window(start: Optional[datetime], end: Optional[datetime], now: datetime) -> bool:
    if start is not None and now < start:
        return False
    if end is not None and now > end:
        return False
    return True


def _apply(sale_type: Optional[str], sale_value: Optional[float], base: float) -> Optional[float]:
    """Devuelve el precio resultante de una oferta, o None si no aplica/es inválida."""
    if sale_value is None:
        return None
    if sale_type == "percent":
        if 0 < sale_value < 100:
            return round(base * (1 - sale_value / 100.0), 2)
        return None
    if sale_type == "fixed":
        # Precio final fijo
        if sale_value >= 0:
            return round(sale_value, 2)
        return None
    if sale_type == "amount":
        # Monto a descontar del precio original (precio - X, nunca bajo 0)
        if sale_value > 0:
            return round(max(0.0, base - sale_value), 2)
        return None
    return None


def compute_effective_price(sku, product, now: Optional[datetime] = None) -> Tuple[float, bool, Optional[datetime]]:
    """
    Devuelve (precio_efectivo, en_oferta, vence_en).

    `vence_en` es el `end` de la oferta vigente (o None si es indefinida/no hay oferta),
    útil para mostrar contadores en el front.
    """
    if now is None:
        now = get_chile_time()

    base = sku.price or 0.0

    # 1. Override del SKU
    if getattr(sku, "sale_type", None) and _within_window(getattr(sku, "sale_start", None), getattr(sku, "sale_end", None), now):
        price = _apply(sku.sale_type, getattr(sku, "sale_value", None), base)
        if price is not None and price < base:
            return price, True, getattr(sku, "sale_end", None)

    # 2. Oferta del producto
    if product is not None and getattr(product, "sale_type", None) and _within_window(getattr(product, "sale_start", None), getattr(product, "sale_end", None), now):
        price = _apply(product.sale_type, getattr(product, "sale_value", None), base)
        if price is not None and price < base:
            return price, True, getattr(product, "sale_end", None)

    return base, False, None
