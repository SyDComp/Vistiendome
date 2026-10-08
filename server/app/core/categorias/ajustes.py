"""
Los ajustes de una categoría tal como valen de verdad: los suyos o, si no los
tiene, los de la categoría de la que cuelga.

Una subcategoría sin valor propio dice "igual que Vestimenta". Se lee subiendo
por el árbol hasta encontrar quién lo dice.
"""

from typing import NamedTuple, Optional

from ...models.catalog import Category

TALLER = "TALLER"
SOLO_BODEGA = "SOLO_BODEGA"

# Lo que se puede elegir hoy. El encargo a proveedor llega en la Fase 3.
ABASTECIMIENTOS = {
    TALLER: "Se confecciona en el taller",
    SOLO_BODEGA: "Solo lo que hay en bodega",
}
SE_DECIDE_AL_CONFIRMAR = "Se decide al confirmar"


class Efectivos(NamedTuple):
    # None: nadie lo dice en la rama ("Sin Categoría"): se decide al confirmar.
    abastecimiento: Optional[str]
    abastecimiento_desde: Optional[Category]   # quién lo dice; None si es propio o nadie
    acepta_personalizacion: bool
    acepta_desde: Optional[Category]


def _subir(categoria: Category, campo: str):
    """El primer valor no nulo subiendo por el árbol, y de quién es."""
    actual, vistas = categoria, set()
    while actual is not None and actual.id not in vistas:
        vistas.add(actual.id)
        valor = getattr(actual, campo)
        if valor is not None:
            return valor, (None if actual is categoria else actual)
        actual = actual.parent
    return None, None


def efectivos(categoria: Category) -> Efectivos:
    abastecimiento, abast_desde = _subir(categoria, "abastecimiento")
    acepta, acepta_desde = _subir(categoria, "acepta_personalizacion")
    return Efectivos(abastecimiento, abast_desde, bool(acepta), acepta_desde)


def etiqueta(abastecimiento: Optional[str]) -> str:
    return ABASTECIMIENTOS.get(abastecimiento, SE_DECIDE_AL_CONFIRMAR) if abastecimiento else SE_DECIDE_AL_CONFIRMAR


def validar_abastecimiento(valor: Optional[str]) -> None:
    if valor is not None and valor not in ABASTECIMIENTOS:
        raise ValueError(f'"{valor}" no es una forma de abastecerse. Opciones: {", ".join(ABASTECIMIENTOS)}.')
