"""
Las listas que la tienda edita (canales, medios de pago, métodos de envío):
leerlas, guardarlas y encontrar un elemento por su nombre.

Guardar recibe la lista como la ve el panel, en orden. Cada elemento es un
texto, o {"origen": nombre que tenía, "nombre": nombre nuevo} cuando el panel
sabe que lo renombró: entonces es el MISMO elemento con otro nombre, y todo lo
que lo usaba muestra el nombre nuevo.

Uno que ya no viene: si nadie lo usó se borra; si se usó, se desactiva (deja
de ofrecerse y lo registrado sigue apuntándole). Uno desactivado que vuelve a
escribirse, se reactiva.
"""

from typing import Any, Callable, Iterable, List, Type

from sqlmodel import Session, SQLModel, func, select


class ValorInexistente(ValueError):
    """Se nombró un elemento que la lista no tiene. El mensaje es para la tienda."""


def _clave(texto: str) -> str:
    return " ".join(str(texto or "").split()).casefold()


# Claves de elementos que el sistema usa pero que no van en la lista editable
# (el saldo a favor no es algo que se elija: aparece cuando hay saldo).
OCULTAS = {"a_favor"}


def _oculto(fila) -> bool:
    return getattr(fila, "clave", None) in OCULTAS


def nombres(db: Session, modelo: Type[SQLModel]) -> List[str]:
    """Los activos de la lista editable, en su orden."""
    filas = db.exec(select(modelo).where(modelo.activo == True).order_by(modelo.orden, modelo.id)).all()  # noqa: E712
    return [f.nombre for f in filas if not _oculto(f)]


def por_clave(db: Session, modelo: Type[SQLModel], clave: str):
    """El elemento que el sistema reconoce por su clave ("efectivo", "local"…), o None."""
    return db.exec(select(modelo).where(modelo.clave == clave)).first()


def por_nombre(db: Session, modelo: Type[SQLModel], nombre: str, que: str):
    """El elemento con ese nombre (sin mirar mayúsculas ni espacios de más), o ValorInexistente."""
    buscado = _clave(nombre)
    for fila in db.exec(select(modelo)).all():
        if _clave(fila.nombre) == buscado:
            return fila
    raise ValorInexistente(f"«{nombre}» no es {que} de la tienda. Recarga la página y vuelve a elegir.")


def guardar(db: Session, modelo: Type[SQLModel], entradas: Iterable[Any], usado: Callable[[int], bool]) -> None:
    """Deja la lista como dice el panel. `usado(id)` dice si algo registrado apunta a ese elemento."""
    todos = [f for f in db.exec(select(modelo)).all() if not _oculto(f)]
    por_texto = {_clave(f.nombre): f for f in todos}
    vistos = set()
    for orden, entrada in enumerate(entradas, start=1):
        if isinstance(entrada, dict):
            origen, nombre = entrada.get("origen"), str(entrada.get("nombre") or "").strip()
        else:
            origen, nombre = None, str(entrada or "").strip()
        if not nombre:
            continue
        fila = por_texto.get(_clave(origen)) if origen else None
        if fila is None or fila.id in vistos:
            fila = por_texto.get(_clave(nombre))
        if fila is None or fila.id in vistos:
            fila = modelo(nombre=nombre)
        fila.nombre, fila.orden, fila.activo = nombre, orden, True
        db.add(fila)
        db.flush()
        vistos.add(fila.id)
    for fila in todos:
        if fila.id in vistos:
            continue
        # Uno que el sistema reconoce por su clave no se borra: se desactiva.
        if usado(fila.id) or getattr(fila, "clave", None):
            fila.activo = False
            db.add(fila)
        else:
            db.delete(fila)


def contar(db: Session, tabla: Type[SQLModel], columna) -> Callable[[int], bool]:
    """Un `usado` que mira si alguna fila de `tabla` apunta al elemento por `columna`."""
    return lambda id_: db.exec(select(func.count()).select_from(tabla).where(columna == id_)).one() > 0
