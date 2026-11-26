"""
Las fotos dentro del JSON de la portada y de los ajustes del sitio.

Un bloque de la portada o la bienvenida no pueden tener una llave foránea: su
contenido es un JSON libre. Ahí la foto se nombra por `asset_id` (o
`image_asset_id`), y la dirección se calcula al leer. Las referencias viejas
que solo traen la dirección también se reconocen, por la dirección o por el
nombre del archivo.
"""

from typing import Any, Set, Tuple

CLAVES_ID = ("asset_id", "image_asset_id", "media_asset_id")
CLAVES_URL = ("url", "image_url", "srcset")


def _nombra(nodo: dict, asset_id: int) -> bool:
    return any(nodo.get(k) == asset_id for k in CLAVES_ID)


def usa(nodo: Any, asset_id: int, agujas: Set[str]) -> bool:
    """¿El JSON nombra la foto, por id o por su dirección/nombre de archivo?"""
    if isinstance(nodo, dict):
        return _nombra(nodo, asset_id) or any(usa(v, asset_id, agujas) for v in nodo.values())
    if isinstance(nodo, list):
        return any(usa(x, asset_id, agujas) for x in nodo)
    if isinstance(nodo, str):
        bajo = nodo.lower()
        return any(a and a in bajo for a in agujas)
    return False


def quitar(nodo: Any, asset_id: int, agujas: Set[str]) -> Tuple[Any, bool]:
    """
    El JSON sin la foto. Una capa de una lista que ES la foto se va entera (una
    imagen sin imagen no se ve); un campo de foto suelto queda vacío. Devuelve
    (nuevo, ¿cambió?).
    """
    if isinstance(nodo, list):
        nuevo, cambio = [], False
        for x in nodo:
            if isinstance(x, dict) and (_nombra(x, asset_id) or any(usa(x.get(k), asset_id, agujas) for k in CLAVES_URL)):
                cambio = True
                continue
            y, c = quitar(x, asset_id, agujas)
            nuevo.append(y)
            cambio = cambio or c
        return nuevo, cambio
    if isinstance(nodo, dict):
        nuevo, cambio = {}, False
        if _nombra(nodo, asset_id) or any(usa(nodo.get(k), asset_id, agujas) for k in CLAVES_URL):
            cambio = True
            nodo = {**nodo, **{k: None for k in CLAVES_ID if k in nodo}, **{k: "" for k in CLAVES_URL if k in nodo}}
        for k, v in nodo.items():
            y, c = quitar(v, asset_id, agujas)
            nuevo[k] = y
            cambio = cambio or c
        return nuevo, cambio
    if isinstance(nodo, str) and usa(nodo, asset_id, agujas):
        return "", True
    return nodo, False
