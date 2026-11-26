"""
Las listas de la tienda (canales, medios de pago, métodos de envío) con lo
que traen de fábrica, si están vacías, y siempre con los elementos que el
sistema reconoce por su clave.

Antes eran ajustes con un valor por defecto: sin fila guardada, valía el
defecto. Al pasar a tablas, una base nueva quedaba sin canales ni medios.
Esto lo usan el arranque en desarrollo y las pruebas; en producción la
migración hace lo mismo con los datos que ya hay.
"""

from typing import Iterable, Optional, Type

from sqlmodel import Session, SQLModel, select

from ..models.listas import CanalPedido, MedioPago, MetodoEnvio
from .ajustes_negocio.registro import AJUSTES, CANALES_PEDIDO, MEDIOS_PAGO

# Los que el sistema reconoce, con el nombre con que nacen. La tienda los
# puede renombrar: se siguen reconociendo por la clave.
CLAVES_CANAL = {"local": "En la tienda"}
CLAVES_MEDIO = {"efectivo": "Efectivo", "a_favor": "Saldo a favor"}
METODOS_ENVIO = ["STARKEN", "CORREOS DE CHILE", "OTRO"]


def _lista(db: Session, modelo: Type[SQLModel], nombres: Iterable[str]) -> None:
    if db.exec(select(modelo)).first() is not None:
        return
    for orden, nombre in enumerate(nombres, start=1):
        db.add(modelo(nombre=nombre, orden=orden))
    db.flush()


def _clave(db: Session, modelo: Type[SQLModel], clave: str, nombre: str, activo: Optional[bool] = None) -> None:
    """Que exista el elemento con esa clave: el que ya se llama así, o uno nuevo."""
    if db.exec(select(modelo).where(modelo.clave == clave)).first() is not None:
        return
    fila = next((f for f in db.exec(select(modelo)).all()
                 if f.clave is None and f.nombre.casefold() == nombre.casefold()), None)
    if fila is None:
        orden = len(db.exec(select(modelo)).all()) + 1
        fila = modelo(nombre=nombre, orden=orden, activo=True if activo is None else activo)
    fila.clave = clave
    db.add(fila)
    db.flush()


def sembrar(db: Session) -> None:
    """Deja las tres listas listas para usar. No hace commit."""
    _lista(db, CanalPedido, AJUSTES[CANALES_PEDIDO].defecto)
    _lista(db, MedioPago, AJUSTES[MEDIOS_PAGO].defecto)
    _lista(db, MetodoEnvio, METODOS_ENVIO)
    for clave, nombre in CLAVES_CANAL.items():
        _clave(db, CanalPedido, clave, nombre)
    for clave, nombre in CLAVES_MEDIO.items():
        _clave(db, MedioPago, clave, nombre)
