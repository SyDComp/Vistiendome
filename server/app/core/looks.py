"""
Colapso de variantes en "looks" para el catálogo y el explorador.

Un look es una tarjeta visualmente distinta. El navegador venía descargando
todas las variantes (1.049 para 4 productos, 278 KB) sólo para dibujar 60
tarjetas: el colapso se hace acá y se manda ya resuelto.

La regla es la misma que estaba probada en el cliente (clusterUtils.js), en
orden de prioridad:

  1. Imagen propia  -> un look por imagen distinta.
  2. Sin imagen     -> un look por valor del atributo que distingue.
  3. Sin ninguno    -> UN solo look que representa al producto.

El paso 2 no asume la característica "COLOR": el catálogo es genérico y mañana
tendrá biblias o lápices, que no tienen color. Se elige la primera
característica que efectivamente varía entre las variantes, descartando las que
no cambian la apariencia (talla y equivalentes).

El paso 3 es deliberado: una variante sin imagen es un estado legítimo, no un
dato incompleto. Antes esto caía a una tarjeta por SKU y un producto sin fotos
por variante llenaba el explorador de tarjetas idénticas.
"""
from typing import Any, Dict, List, Optional

# Características que no cambian cómo se ve la prenda: no sirven para separar
# looks. Se comparan en minúscula y sin distinguir el nombre exacto que haya
# cargado la clienta.
ATRIBUTOS_NO_VISUALES = {"talla", "tallas", "size", "sizes", "medida", "medidas"}


def _es_visual(nombre: str) -> bool:
    return nombre.strip().lower() not in ATRIBUTOS_NO_VISUALES


def elegir_atributo_distintivo(variantes: List[Any]) -> Optional[str]:
    """
    Devuelve el nombre de la característica que mejor separa las variantes
    cuando no hay imágenes: la primera que sea visual y tenga más de un valor.

    Devuelve None si ninguna distingue (todas las variantes se ven igual).
    """
    if not variantes:
        return None

    valores_por_atributo: Dict[str, set] = {}
    for v in variantes:
        for nombre, valor in (v.config or {}).items():
            if not _es_visual(nombre) or valor in (None, ""):
                continue
            valores_por_atributo.setdefault(nombre, set()).add(str(valor).strip().lower())

    # Orden estable: el primero declarado en la config que además varíe.
    for nombre in valores_por_atributo:
        if len(valores_por_atributo[nombre]) > 1:
            return nombre
    return None


def colapsar_en_looks(producto: Any, variantes: List[Any],
                      imagen_de: Dict[int, Optional[str]]) -> List[Dict[str, Any]]:
    """
    Colapsa las variantes de UN producto en su lista de looks.

    `imagen_de` mapea sku.id -> url de su imagen propia (o None). Se recibe ya
    resuelto para no disparar una consulta por variante.
    """
    if not variantes:
        return [_look_del_producto(producto)]

    atributo = elegir_atributo_distintivo(variantes)
    looks: List[Dict[str, Any]] = []
    vistos = set()

    for v in variantes:
        imagen = imagen_de.get(v.id)
        valor = (v.config or {}).get(atributo) if atributo else None

        if imagen:
            clave = f"img::{imagen}"
        elif valor:
            clave = f"attr::{str(valor).strip().lower()}"
        else:
            # Nada que distinga: una sola tarjeta del producto.
            clave = "base"

        if clave in vistos:
            continue
        vistos.add(clave)

        if clave == "base":
            looks.append(_look_del_producto(producto))
        else:
            looks.append({
                "id": f"{producto.id}-{v.sku}",
                "product_id": producto.id,
                "slug": producto.slug,
                "name": f"{producto.name} · {valor}" if valor else producto.name,
                "image": imagen,
                "sku": v.sku,
                "config": v.config or {},
                "price": v.price,
            })

    return looks


def _look_del_producto(producto: Any) -> Dict[str, Any]:
    """Tarjeta que representa al producto entero, no a una variante suelta."""
    return {
        "id": f"{producto.id}-base",
        "product_id": producto.id,
        "slug": producto.slug,
        "name": producto.name,
        "image": None,
        "sku": None,
        "config": {},
        "price": None,
    }
