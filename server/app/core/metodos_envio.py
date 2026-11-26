"""
Los métodos de envío y su color, en el formato del panel y de la tienda.

El panel los lee y guarda como dos ajustes del sitio: `shipping_methods`
(["STARKEN", ...]) y `shipping_colors` ({"STARKEN": "#..."}). Antes eran eso,
dos ajustes de texto: el color iba atado al nombre, y los pedidos copiaban el
nombre. Ahora viven en metodo_envio (models/listas.py) con identidad.
"""

from typing import Any, Dict, List

from sqlmodel import Session, select

from ..models.crm import Cotizacion
from ..models.iam import Persona
from ..models.listas import MetodoEnvio
from . import listas

CLAVE_METODOS = "shipping_methods"
CLAVE_COLORES = "shipping_colors"


class EnvioInvalido(ValueError):
    """El panel mandó algo que no es una lista de métodos o de colores."""


def _usado(db: Session):
    por_pedido = listas.contar(db, Cotizacion, Cotizacion.metodo_envio_id)
    por_clienta = listas.contar(db, Persona, Persona.metodo_envio_preferido_id)
    return lambda id_: por_pedido(id_) or por_clienta(id_)


def leer_metodos(db: Session) -> List[str]:
    return listas.nombres(db, MetodoEnvio)


def guardar_metodos(db: Session, valor: Any) -> None:
    if not isinstance(valor, list):
        raise EnvioInvalido("Los métodos de envío tienen que ser una lista.")
    listas.guardar(db, MetodoEnvio, valor, _usado(db))


def leer_colores(db: Session) -> Dict[str, str]:
    activos = db.exec(select(MetodoEnvio).where(MetodoEnvio.activo == True)).all()  # noqa: E712
    return {m.nombre: m.color for m in activos if m.color}


def guardar_colores(db: Session, valor: Any) -> None:
    """El color de cada método, por su nombre. Un nombre que no es un método no se guarda."""
    if not isinstance(valor, dict):
        raise EnvioInvalido("Los colores tienen que ser {método: color}.")
    for nombre, color in valor.items():
        try:
            metodo = listas.por_nombre(db, MetodoEnvio, nombre, "un método de envío")
        except listas.ValorInexistente as e:
            raise EnvioInvalido(str(e))
        metodo.color = (str(color).strip() or None) if color else None
        db.add(metodo)
