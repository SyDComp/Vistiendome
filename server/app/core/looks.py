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

def _es_visual(nombre: str, visuales: set) -> bool:
    """
    Si una característica cambia la apariencia lo declara la clienta
    (Characteristic.afecta_apariencia), no lo adivina el sistema. Antes acá
    había una lista fija con "talla", "size" y "medida": una adivinanza que
    funcionaba sólo para ropa y se rompía con el primer producto distinto.
    """
    return nombre.strip().lower() in visuales


def imagen_de_variante(sku: Any) -> Optional[str]:
    """
    Imagen representativa de una variante, de forma determinista.

    `sku.media_assets` no tiene orden garantizado: Postgres devuelve las filas
    en el orden que quiera, así que tomar el elemento [0] daba resultados
    distintos entre consultas. Con variantes que tienen más de una foto (en
    "vestido perla" hay 6 con dos imágenes cada una) eso cambiaba la cantidad de
    looks y la foto mostrada entre recargas. Se ordena por id para fijarlo.
    """
    if not sku.media_assets:
        return None
    return sorted(sku.media_assets, key=lambda m: m.id)[0].url


def clave_visual(config: Dict[str, Any], visuales: set) -> Optional[str]:
    """
    Proyecta una variante sobre sus características visuales.

    Una variante es un punto del producto cartesiano de todas las
    características. Un look es la proyección de ese punto sobre el subconjunto
    visual: dos variantes que sólo difieren en talla caen en el mismo look.

    Se usan TODAS las visuales, no una sola: un vestido Rojo/Manga Larga y uno
    Rojo/Sin Manga son looks distintos si ambas características afectan la
    apariencia. Devuelve None si la variante no tiene ninguna visual con valor.
    """
    partes = []
    for nombre, valor in sorted((config or {}).items()):
        if _es_visual(nombre, visuales) and valor not in (None, ""):
            partes.append(f"{nombre.strip().lower()}={str(valor).strip().lower()}")
    return "|".join(partes) if partes else None


def colapsar_en_looks(producto: Any, variantes: List[Any],
                      imagen_de: Dict[int, Optional[str]],
                      visuales: set) -> List[Dict[str, Any]]:
    """
    Colapsa las variantes de UN producto en su lista de looks.

    `imagen_de` mapea sku.id -> url de su imagen propia (o None), ya resuelto
    para no disparar una consulta por variante.
    `visuales` son los nombres (en minúscula) de las características marcadas
    como que afectan la apariencia.

    Orden de la regla:
      1. Imagen propia: es la verdad empírica, si tiene otra foto se ve distinta.
      2. Sin imagen: la proyección sobre las características visuales.
      3. Ninguna de las dos: una sola tarjeta del producto.
    """
    if not variantes:
        return [_look_del_producto(producto)]

    looks: List[Dict[str, Any]] = []
    vistos = set()

    for v in variantes:
        imagen = imagen_de.get(v.id)
        visual = clave_visual(v.config, visuales)

        if imagen:
            clave = f"img::{imagen}"
        elif visual:
            clave = f"vis::{visual}"
        else:
            clave = "base"

        if clave in vistos:
            continue
        vistos.add(clave)

        if clave == "base":
            looks.append(_look_del_producto(producto))
            continue

        # Descriptor legible: los valores visuales de ESTA variante.
        descriptor = " · ".join(
            str(val) for nombre, val in sorted((v.config or {}).items())
            if _es_visual(nombre, visuales) and val not in (None, "")
        )
        looks.append({
            "id": f"{producto.id}-{v.sku}",
            "product_id": producto.id,
            "slug": producto.slug,
            "name": f"{producto.name} · {descriptor}" if descriptor else producto.name,
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
