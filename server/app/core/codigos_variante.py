"""
El código de una variante: la dirección del producto y sus valores.

    PR-VESTIDO_PERLA-REDONDO-FLORAL_PRIMAVERA-34-TELA_PUNTO_ROMA-12

Una sola regla para todo el catálogo, y la aplica el servidor al guardar: el
código sigue al nombre del producto, igual que su dirección (decisión del
usuario 2026-11-06). Lo que manda el formulario es provisorio.

Los valores van por el nombre de su característica, en orden alfabético: si
siguieran el orden de la tienda, mover una característica con las flechas
cambiaría los códigos.

Nada se identifica por este código: pedidos y bodega usan el id de la variante,
y la pistola lee el código de barras.
"""

from typing import Dict, Set

from sqlmodel import Session, select

from ..models.catalog import Product, SKU
from .categorias.ubicacion import slugify


def codigo_de(direccion: str, config: Dict[str, str]) -> str:
    valores = (slugify(str((config or {})[k])) for k in sorted(config or {}, key=str.upper))
    return "-".join(p for p in (direccion, *valores) if p).upper()


def _libre(codigo: str, usados: Set[str]) -> str:
    """Dos variantes con los mismos valores (una dada de baja) no pueden compartirlo."""
    if codigo not in usados:
        return codigo
    n = 2
    while f"{codigo}_{n}" in usados:
        n += 1
    return f"{codigo}_{n}"


def recodificar(db: Session, producto: Product) -> None:
    """Deja las variantes del producto (también las de baja) con su código. No hace commit."""
    db.flush()
    variantes = db.exec(select(SKU).where(SKU.product_id == producto.id).order_by(SKU.id)).all()
    ajenos = set(db.exec(select(SKU.sku).where(SKU.product_id != producto.id)).all())
    nuevos, usados = {}, set(ajenos)
    # Las activas primero: el código limpio es de la que se vende.
    for v in sorted(variantes, key=lambda x: x.is_deleted):
        nuevos[v.id] = _libre(codigo_de(producto.slug, v.config), usados)
        usados.add(nuevos[v.id])

    cambian = [v for v in variantes if v.sku != nuevos[v.id]]
    # En dos pasos: el código nuevo de una podría ser hoy el de otra, y el índice
    # único no lo dejaría pasar.
    for v in cambian:
        v.sku = f"__{v.id}"
        db.add(v)
    db.flush()
    for v in cambian:
        v.sku = nuevos[v.id]
        db.add(v)
    db.flush()
