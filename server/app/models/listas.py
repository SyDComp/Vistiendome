"""
Las listas que la tienda edita en el panel y que los pedidos y pagos usan:
cómo llegó el pedido, con qué se pagó, cómo se envía.

Antes eran listas de texto (en los ajustes) y cada pedido o pago copiaba el
texto: renombrar "Débito" dejaba los pagos viejos con "Débito" y el cierre de
caja los separaba en dos. Ahora cada elemento tiene identidad y lo usado le
apunta. Quitar uno que ya se usó lo desactiva: deja de ofrecerse, y lo
registrado sigue apuntándole (core/listas).
"""

from typing import Optional

from sqlmodel import Field, SQLModel


class CanalPedido(SQLModel, table=True):
    """«¿Cómo llegó?» de un pedido cargado en el panel: WhatsApp, Instagram…"""
    __tablename__ = "canal_pedido"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=60, unique=True)
    # Los que el sistema necesita reconocer: "local" es el de la venta en la
    # caja. Antes se buscaba por el nombre "En la tienda" escrito en el código:
    # renombrarlo sacaba las ventas del local del cierre de caja.
    clave: Optional[str] = Field(default=None, max_length=20, unique=True)
    orden: int = Field(default=0)
    activo: bool = Field(default=True)


class MedioPago(SQLModel, table=True):
    """Con qué se puede pagar: Efectivo, Transferencia, Débito…"""
    __tablename__ = "medio_pago"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=60, unique=True)
    # Los que el sistema reconoce: "efectivo" (el vuelto, lo que hay en el
    # cajón) y "a_favor" (pagar con saldo a favor; no se ofrece en la lista,
    # aparece cuando la clienta tiene saldo). Antes se reconocían por los
    # nombres "Efectivo" y "Saldo a favor" escritos en el código y en el panel.
    clave: Optional[str] = Field(default=None, max_length=20, unique=True)
    orden: int = Field(default=0)
    activo: bool = Field(default=True)


class MetodoEnvio(SQLModel, table=True):
    """Cómo se despacha un pedido (Starken, Correos…), con el color con que se marca en el panel."""
    __tablename__ = "metodo_envio"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    orden: int = Field(default=0)
    activo: bool = Field(default=True)
    color: Optional[str] = Field(default=None, max_length=20)
