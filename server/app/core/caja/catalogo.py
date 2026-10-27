"""
Una página del selector de la caja: los productos con algo libre que cumple
el filtro (lo más vendido primero), las piezas únicas que lo cumplen, y las
facetas: por cada filtro posible, sus opciones y cuántos productos quedarían
al elegirla. Los filtros son la Categoría y las características que la tienda
marca "Filtro: SÍ", en su orden (decisión del usuario 2026-10-26: sin precio).
"""

import math
from dataclasses import dataclass, field
from typing import Dict, List

from sqlmodel import Session, select

from ...models.catalog import Category, Characteristic
from ..vendidos import vendidos_por_producto
from .filtro import Filtro, cumple, valor_de
from .fotos import fotos
from .libres import Libre, piezas_libres, variantes_libres

POR_PAGINA = 10   # las teclas 1 a 9 y 0


@dataclass
class Pagina:
    productos: List[dict]
    total: int
    pagina: int
    paginas: int
    piezas: List[Libre]
    facetas: List[dict] = field(default_factory=list)


def _productos_de(libres: List[Libre]) -> Dict[int, List[Libre]]:
    por = {}
    for x in libres:
        por.setdefault(x.producto_id, []).append(x)
    return por


def _facetas(db: Session, libres: List[Libre], filtro: Filtro) -> List[dict]:
    salida = []
    sin_categoria = _productos_de([x for x in libres if cumple(x, filtro.sin(categorias=True))])
    conteo = {}
    for variantes in sin_categoria.values():
        conteo[variantes[0].categoria_id] = conteo.get(variantes[0].categoria_id, 0) + 1
    categorias = {c.id: c for c in db.exec(select(Category).where(Category.id.in_(list(conteo)))).all()} if conteo else {}
    salida.append({
        "clave": "categoria", "nombre": "Categoría",
        "opciones": sorted(
            [{"valor": str(cid), "etiqueta": categorias[cid].name, "productos": n,
              "elegida": cid in filtro.categorias} for cid, n in conteo.items() if cid in categorias],
            key=lambda o: o["etiqueta"]),
    })
    filtrables = db.exec(select(Characteristic).where(Characteristic.is_filterable == True)  # noqa: E712
                         .order_by(Characteristic.orden, Characteristic.id)).all()
    for c in filtrables:
        nombre = c.name.upper()
        quedan = [x for x in libres if cumple(x, filtro.sin(caracteristica=nombre))]
        productos_por_valor = {}
        for x in quedan:
            v = valor_de(x.config, nombre)
            if v:
                productos_por_valor.setdefault(v, set()).add(x.producto_id)
        if not productos_por_valor:
            continue
        orden = [o.get("value") for o in (c.domain or []) if isinstance(o, dict)]
        extras = {o.get("value"): o for o in (c.domain or []) if isinstance(o, dict)}
        elegidos = filtro.caracteristicas.get(nombre, set())
        opciones = sorted(productos_por_valor, key=lambda v: (orden.index(v) if v in orden else len(orden), v))
        salida.append({
            "clave": nombre, "nombre": c.name.capitalize(),
            "opciones": [{"valor": v, "etiqueta": v, "productos": len(productos_por_valor[v]), "elegida": v in elegidos,
                          "hex": extras.get(v, {}).get("hex_code"), "imagen": extras.get(v, {}).get("image_url") or None}
                         for v in opciones],
        })
    return salida


def pagina(db: Session, filtro: Filtro, numero: int = 1, por_pagina: int = POR_PAGINA) -> Pagina:
    libres = variantes_libres(db)
    cumplen = _productos_de([x for x in libres if cumple(x, filtro)])
    vendidos = vendidos_por_producto(db)
    orden = sorted(cumplen, key=lambda pid: (-vendidos.get(pid, 0), cumplen[pid][0].nombre))
    paginas = max(1, math.ceil(len(orden) / por_pagina))
    numero = min(max(1, numero), paginas)
    ids = orden[(numero - 1) * por_pagina: numero * por_pagina]
    foto = fotos(db, ids)
    productos = [{
        "id": pid, "nombre": cumplen[pid][0].nombre,
        "imagen": foto.get(pid, ("", ""))[0], "imagen_srcset": foto.get(pid, ("", ""))[1],
        "libres": sum(x.disponible for x in cumplen[pid]), "vendidos": vendidos.get(pid, 0),
    } for pid in ids]
    # Las piezas únicas no tienen categoría: con una categoría elegida, no van.
    piezas = [] if filtro.categorias else [p for p in piezas_libres(db) if cumple(p, filtro)]
    return Pagina(productos=productos, total=len(orden), pagina=numero, paginas=paginas,
                  piezas=piezas, facetas=_facetas(db, libres, filtro))
