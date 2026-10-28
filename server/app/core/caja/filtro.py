"""
Qué se busca en la caja: valores de características (Color: Negro o Azul),
categorías y palabras sueltas (que buscan en el nombre y los códigos).
Lo arman el buscador (lo que entendió de lo escrito) y los filtros del
selector; el servidor lo aplica.
"""

from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Set

from .libres import Libre
from .texto import calza, palabras


@dataclass
class Filtro:
    caracteristicas: Dict[str, Set[str]] = field(default_factory=dict)   # {"COLOR": {"Negro", "Azul"}}
    categorias: Set[int] = field(default_factory=set)                   # con sus subcategorías ya incluidas
    palabras: List[str] = field(default_factory=list)

    @classmethod
    def desde(cls, valores: Iterable[str] = (), categorias: Iterable[int] = (), texto: Iterable[str] = ()) -> "Filtro":
        """`valores`: "CARACTERISTICA=valor", una por valor elegido."""
        por = {}
        for v in valores:
            if "=" in v:
                c, valor = v.split("=", 1)
                por.setdefault(c.strip().upper(), set()).add(valor.strip())
        return cls(caracteristicas=por, categorias=set(categorias), palabras=[p for t in texto for p in palabras(t)])

    def sin(self, caracteristica: Optional[str] = None, categorias: bool = False) -> "Filtro":
        """El mismo filtro sin un grupo: para contar cuántos quedarían eligiendo otra opción de ese grupo."""
        return Filtro(
            caracteristicas={c: v for c, v in self.caracteristicas.items() if c != caracteristica},
            categorias=set() if categorias else self.categorias,
            palabras=self.palabras,
        )


def valor_de(config: Dict[str, str], caracteristica: str) -> Optional[str]:
    return next((v for k, v in (config or {}).items() if k.upper() == caracteristica), None)


def cumple(libre: Libre, filtro: Filtro) -> bool:
    if filtro.categorias and libre.tipo == "variante" and libre.categoria_id not in filtro.categorias:
        return False
    if any(valor_de(libre.config, c) not in valores for c, valores in filtro.caracteristicas.items()):
        return False
    # También en los valores de sus características: una palabra que calza en
    # dos (Color y Estampado) llega suelta y trae lo que tenga una u otra.
    donde = palabras(" ".join(str(x) for x in (libre.nombre, libre.codigo, libre.barcode, *(libre.config or {}).values()) if x))
    return all(any(calza(p, w) for w in donde) for p in filtro.palabras)
