"""
Opciones que proponen los clientes.

TRES PROCEDENCIAS, NO DOS
Una opción de una característica —un color, un largo— puede venir de tres
lados, y hay que poder distinguirlos:

  · del sistema   las que trae la plataforma. En el `domain` de la
                  característica van con `is_system: true`.
  · de la clienta las que crea Paola desde el panel. Van en el mismo `domain`
                  con `is_system: false`.
  · propuesta     la que pide un cliente y todavía NO existe en el catálogo.
                  Vive acá, fuera del `domain`, hasta que Paola la apruebe.

QUIÉN puede crear QUÉ
Paola crea las características que quiera y las opciones que quiera. El cliente
NO crea características: sólo puede proponer una opción dentro de una que ya
existe. Por eso esta tabla apunta siempre a un `attribute` existente.

POR QUÉ UNA FILA POR PROPUESTA Y NO UNA MARCA EN LA OPCIÓN
Si tres clientas piden "Turquesa Perla", la opción es UNA y las proponentes son
TRES. Esa cuenta es la señal que necesita Paola para decidir si vale la pena
crear el color: con una marca sí/no se pierde.

Y guardado dentro del JSON del `domain` no habría relación real con la persona
ni con el pedido —ni forma cómoda de contar—, así que va en su propia tabla:
una fila por cada vez que alguien la propone, agrupables por valor.

QUÉ PASA AL APROBAR
La opción se agrega al `domain` de su característica como una opción normal de
Paola (`is_system: false`) y estas filas quedan como historial: quién la pidió
primero y cuántos la pidieron. El pedido que la originó no se toca — es un
contrato y dice lo que decía cuando se firmó.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlmodel import SQLModel, Field
import ulid


def generate_ulid() -> str:
    return str(ulid.ULID())


class EstadoPropuesta(str, Enum):
    # Esperando que Paola la mire.
    PENDIENTE = "PENDIENTE"
    # Aprobada: ya existe como opción en el `domain` de la característica.
    APROBADA = "APROBADA"
    # Vista y descartada. No se borra: si vuelven a pedirla, hay que saber que
    # ya se dijo que no, en vez de volver a evaluarla desde cero.
    RECHAZADA = "RECHAZADA"


class OpcionPropuesta(SQLModel, table=True):
    __tablename__ = "opciones_propuestas"

    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)

    # Siempre sobre una característica que YA existe: el cliente no crea
    # características, sólo opciones dentro de ellas.
    attribute_id: int = Field(foreign_key="attribute.id", index=True)

    # Lo que pidió, tal cual lo escribió.
    valor: str = Field(max_length=120)
    # El mismo valor normalizado (minúsculas, sin acentos ni espacios de más),
    # para juntar "Turquesa Perla", "turquesa perla" y "TURQUESA  PERLA" como
    # una sola propuesta con tres proponentes en vez de tres propuestas.
    valor_normalizado: str = Field(max_length=120, index=True)

    # Quién la propuso y en qué pedido. Sin esto no se puede volver a la clienta
    # a decirle "ya la tenemos".
    persona_id: Optional[str] = Field(default=None, foreign_key="personas.id", index=True, max_length=26)
    cotizacion_id: Optional[str] = Field(default=None, foreign_key="cotizaciones.id", index=True, max_length=26)

    estado: EstadoPropuesta = Field(default=EstadoPropuesta.PENDIENTE, index=True)

    creado_en: datetime = Field(default_factory=datetime.utcnow)
    resuelto_en: Optional[datetime] = Field(default=None)
