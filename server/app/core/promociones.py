"""
Las promociones en el formato del panel y de la tienda.

El panel las lee y guarda como el ajuste `promotions`:
    {"promos": [{name, type, lleva, paga, descuento, min_unidades, min_monto,
                 regalo_texto, desde, hasta, combinable, active, productos: ["12", ...]}]}
Aquí se traducen a las tablas, que apuntan a los productos por identidad
(models/promociones.py).
"""

from datetime import date
from typing import Any, Dict, List

from sqlmodel import Session, delete, select

from ..models.catalog import Product
from ..models.promociones import Promocion, PromocionProducto

CLAVE = "promotions"


class PromocionInvalida(ValueError):
    """Una promoción nombra algo que no existe o trae una fecha que no es fecha. El mensaje es para la tienda."""


def _fecha(valor: Any, quien: str):
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor)[:10])
    except ValueError:
        raise PromocionInvalida(f"{quien}: '{valor}' no es una fecha.")


def _entero(valor: Any) -> int:
    try:
        return int(valor or 0)
    except (TypeError, ValueError):
        return 0


def como_ajuste(db: Session) -> Dict[str, List[Dict[str, Any]]]:
    promos = db.exec(select(Promocion).order_by(Promocion.orden, Promocion.id)).all()
    return {"promos": [{
        "name": p.nombre,
        "type": p.tipo,
        "lleva": p.lleva,
        "paga": p.paga,
        "descuento": p.descuento,
        "min_unidades": p.min_unidades,
        "min_monto": p.min_monto,
        "regalo_texto": p.regalo_texto,
        "desde": p.desde.isoformat() if p.desde else "",
        "hasta": p.hasta.isoformat() if p.hasta else "",
        "combinable": p.combinable,
        "active": p.activa,
        "productos": [str(x.product_id) for x in sorted(p.productos, key=lambda x: x.product_id)],
    } for p in promos]}


def guardar(db: Session, valor: Any) -> None:
    """Reemplaza las promociones por las que manda el panel. Si una nombra algo que no existe, no se guarda ninguna."""
    nuevas = []
    for orden, p in enumerate((valor or {}).get("promos") or [], start=1):
        nombre = (p.get("name") or "").strip()
        quien = f"La promoción «{nombre}»" if nombre else f"La promoción {orden}"
        ids = sorted({int(x) for x in (p.get("productos") or [])})
        if ids:
            existen = set(db.exec(select(Product.id).where(Product.id.in_(ids))).all())
            if set(ids) - existen:
                raise PromocionInvalida(f"{quien} nombra productos que no existen: {sorted(set(ids) - existen)}.")
        nuevas.append(Promocion(
            orden=orden,
            nombre=nombre,
            tipo=p.get("type") or "cantidad",
            lleva=_entero(p.get("lleva")),
            paga=_entero(p.get("paga")),
            descuento=_entero(p.get("descuento")),
            min_unidades=_entero(p.get("min_unidades")),
            min_monto=_entero(p.get("min_monto")),
            regalo_texto=(p.get("regalo_texto") or "").strip(),
            desde=_fecha(p.get("desde"), quien),
            hasta=_fecha(p.get("hasta"), quien),
            combinable=bool(p.get("combinable")),
            activa=p.get("active") is not False,
            productos=[PromocionProducto(product_id=x) for x in ids],
        ))

    db.exec(delete(PromocionProducto))
    db.exec(delete(Promocion))
    db.add_all(nuevas)
