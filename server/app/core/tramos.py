"""
Los precios por cantidad en el formato del panel y de la tienda.

El panel los lee y guarda como el ajuste `price_tiers`:
    {"tiers": [{name, characteristic, from, to, min_qty, discount_type,
                discount_value, active, productos: ["12", ...]}]}
con NOMBRES. Aquí se traducen a las tablas, que apuntan por identidad
(models/tramos.py): lo que se lee siempre trae los nombres de hoy.
"""

from typing import Any, Dict, List

from sqlmodel import Session, delete, select

from ..models.catalog import Product
from ..models.tramos import TramoPrecio, TramoProducto
from .caracteristicas import biblioteca, normalize_char, normalize_opt

CLAVE = "price_tiers"


class TramoInvalido(ValueError):
    """Un tramo nombra algo que no existe. El mensaje es para la tienda."""


def como_ajuste(db: Session) -> Dict[str, List[Dict[str, Any]]]:
    tramos = db.exec(select(TramoPrecio).order_by(TramoPrecio.orden, TramoPrecio.id)).unique().all()
    return {"tiers": [{
        "name": t.nombre,
        "characteristic": t.caracteristica.name if t.caracteristica else "",
        "from": t.desde.valor if t.desde else "",
        "to": t.hasta.valor if t.hasta else "",
        "min_qty": t.min_unidades,
        "discount_type": t.tipo_descuento,
        "discount_value": t.valor_descuento,
        "active": t.activo,
        "productos": [str(p.product_id) for p in sorted(t.productos, key=lambda p: p.product_id)],
    } for t in tramos]}


def guardar(db: Session, valor: Any) -> None:
    """Reemplaza los tramos por los que manda el panel. Si uno nombra algo que no existe, no se guarda ninguno."""
    libro = biblioteca(db)
    nuevos = []
    for orden, t in enumerate((valor or {}).get("tiers") or [], start=1):
        nombre = (t.get("name") or "").strip()
        quien = f"El tramo «{nombre}»" if nombre else f"El tramo {orden}"
        tramo = TramoPrecio(
            orden=orden,
            nombre=nombre,
            min_unidades=int(t.get("min_qty") or 0),
            tipo_descuento=t.get("discount_type") or "percent",
            valor_descuento=float(t.get("discount_value") or 0),
            activo=t.get("active") is not False,
        )
        car_nombre = normalize_char(t.get("characteristic") or "")
        if car_nombre:
            if car_nombre not in libro:
                raise TramoInvalido(f"{quien} usa la característica '{car_nombre}', que no existe.")
            caracteristica, opciones = libro[car_nombre]
            tramo.caracteristica_id = caracteristica.id
            for campo, destino in (("from", "desde_opcion_id"), ("to", "hasta_opcion_id")):
                v = normalize_opt(t.get(campo) or "")
                if not v:
                    continue
                if v not in opciones:
                    raise TramoInvalido(f"{quien}: '{v}' no es una opción de {caracteristica.name}.")
                setattr(tramo, destino, opciones[v].id)
        ids = sorted({int(p) for p in (t.get("productos") or [])})
        if ids:
            existen = set(db.exec(select(Product.id).where(Product.id.in_(ids))).all())
            if set(ids) - existen:
                raise TramoInvalido(f"{quien} nombra productos que no existen: {sorted(set(ids) - existen)}.")
        tramo.productos = [TramoProducto(product_id=p) for p in ids]
        nuevos.append(tramo)

    db.exec(delete(TramoProducto))
    db.exec(delete(TramoPrecio))
    db.add_all(nuevos)
