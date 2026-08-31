from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum
import ulid

def generate_ulid() -> str:
    return str(ulid.ULID())

class EstadoCotizacion(str, Enum):
    """
    El recorrido de un pedido, con un significado por estado.

    Regla con la que se eligieron: **un estado existe sólo si alguien tiene que
    declararlo Y algo depende de él.** Lo que el sistema ya sabe no se pregunta.
    Por eso NO hay un estado "en corte": si una pieza está cortada lo sabe el
    sistema (`CotizacionItem.cortado`, que pone la orden de corte), y pedirle a
    la clienta que además lo declare abre la puerta a que las dos versiones no
    coincidan.

    Antes eran NUEVA / EN_PROCESO / CERRADA_EXITO / CERRADA_PERDIDA. El problema
    no era cómo estaban implementados sino que nunca se decidió qué querían
    decir: el glosario de la pantalla definía EN_PROCESO como "contactando al
    cliente **o armando pedido**" — dos cosas distintas en una línea.
    """

    # Llegó del sitio o se cargó a mano. No requiere ningún clic.
    NUEVA = "NUEVA"

    # Se está hablando con la clienta: tallas, precio, plazos. Informativo.
    EN_CONVERSACION = "EN_CONVERSACION"

    # La clienta aceptó. ES LA PUERTA DE LA PRODUCCIÓN: recién acá las piezas
    # aparecen como pendientes de corte, porque cortar tela es irreversible y
    # cuesta material.
    CONFIRMADA = "CONFIRMADA"

    # Salió del taller. ACÁ SALE EL STOCK, y no antes: hasta este momento la
    # prenda seguía en la casa. Se marca sola al imprimir la etiqueta de envío,
    # que es el momento real del despacho, así que no cuesta un clic extra.
    DESPACHADA = "DESPACHADA"

    # No se concretó: la clienta no aceptó, o un pedido confirmado se cayó.
    CANCELADA = "CANCELADA"

class OrigenCotizacion(str, Enum):
    CATALOGO = "CATALOGO"
    CONTACTO_INDIVIDUAL = "CONTACTO_INDIVIDUAL"
    CONTACTO_GRUPAL = "CONTACTO_GRUPAL"
    MANUAL = "MANUAL"

class ModoEntrega(str, Enum):
    """
    Cómo llega la prenda a la clienta. Son dos cosas distintas de verdad, no dos
    nombres de lo mismo.

    Antes esto vivía DENTRO del campo del transportista, que es texto libre que
    la clienta edita: convivían "RETIRO EN LOCAL", "RETIRO EN TIENDA" y
    "RETIRO_LOCAL" para el mismo caso, y encima un despacho a sucursal se
    guardaba como "STARKEN (retiro en sucursal)" — que contiene la palabra
    "retiro" y ES un despacho. Cualquier regla que leyera ese texto se
    equivocaba.

    OJO con "retiro en sucursal": ES UN DESPACHO. Starken se llevó la prenda del
    local de Paola y la clienta la retira DE LA AGENCIA. Eso vive en
    `tipo_despacho`, que responde otra pregunta: a dónde la lleva el
    transportista.
    """

    # La clienta viene al local de Paola. No hay transportista, no hay
    # dirección, y la prenda NO SALE hasta que ella la busca.
    RETIRO = "RETIRO"

    # Sale con un transportista. El cuál y el a dónde los responden
    # `transporte` y `tipo_despacho`.
    DESPACHO = "DESPACHO"


class TipoDespacho(str, Enum):
    """A dónde la lleva el transportista. Sólo aplica si el modo es DESPACHO."""
    DOMICILIO = "DOMICILIO"
    # A la agencia del transportista, donde la clienta la retira. Sigue siendo
    # un despacho: la prenda ya salió del local.
    SUCURSAL = "SUCURSAL"


class Cotizacion(SQLModel, table=True):
    __tablename__ = "cotizaciones"
    
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    persona_id: str = Field(foreign_key="personas.id", index=True, max_length=26)

    # Correlativo humano ("N° pedido 56") — el id (ULID) identifica la fila,
    # pero nadie lo puede decir por teléfono ni escribirlo en una etiqueta.
    # Se asigna explícitamente en el endpoint de creación vía nextval(),
    # nunca queda en None en una fila real.
    numero: Optional[int] = Field(default=None, unique=True, index=True)

    origen: OrigenCotizacion = Field(default=OrigenCotizacion.CATALOGO)
    estado: EstadoCotizacion = Field(default=EstadoCotizacion.NUEVA)

    # Retiro o despacho. Nullable sólo por los pedidos anteriores a que este
    # campo existiera; los nuevos siempre lo traen.
    modo_entrega: Optional[ModoEntrega] = Field(default=None)
    
    # Datos de Contacto/Mensaje
    mensaje: Optional[str] = Field(default=None)
    tipo_grupo: Optional[str] = Field(default=None)
    cantidad_aprox: Optional[int] = Field(default=None)
    fecha_evento: Optional[str] = Field(default=None)
    
    # Etiqueta de Envío
    transporte: Optional[str] = Field(default=None, max_length=100)
    tipo_despacho: Optional[TipoDespacho] = Field(default=None)
    region: Optional[str] = Field(default=None, max_length=100)
    comuna: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=255) # O 'Sucursal Chillan' si es a sucursal
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    persona: "Persona" = Relationship(back_populates="cotizaciones")
    items: List["CotizacionItem"] = Relationship(back_populates="cotizacion")

class CotizacionItem(SQLModel, table=True):
    __tablename__ = "cotizacion_items"
    
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    cotizacion_id: str = Field(foreign_key="cotizaciones.id", index=True, max_length=26)
    
    sku_id: Optional[int] = Field(default=None, foreign_key="sku.id", index=True)
    cantidad: int = Field(default=1)
    precio_unitario_estimado: float = Field(default=0.0)
    nombre_custom: Optional[str] = Field(default=None, max_length=255)

    # Vive en el ítem, no en la Cotizacion: una cotización puede tener piezas
    # ya cortadas y otras no. El estado de la Cotizacion (NUEVA/CONFIRMADA/...)
    # es el ciclo de la VENTA; esto es el ciclo de la CONFECCIÓN — ejes distintos.
    cortado: bool = Field(default=False)

    # Relationships
    cotizacion: Cotizacion = Relationship(back_populates="items")
    sku: Optional["SKU"] = Relationship(back_populates="cotizacion_items")
