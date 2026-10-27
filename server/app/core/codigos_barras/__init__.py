"""Los códigos de barras de las variantes: cómo se asignan y cuándo uno es válido."""

from .asignar import nuevo_codigo
from .formato import CodigoInvalido, revisar
from .numero import PREFIJO, codigo_desde, digito_control, es_ean13_valido

__all__ = ["PREFIJO", "CodigoInvalido", "codigo_desde", "digito_control", "es_ean13_valido", "nuevo_codigo", "revisar"]
