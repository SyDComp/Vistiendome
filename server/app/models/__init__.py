from .iam import Persona, TipoPersona, CuentaAcceso, EstadoCuenta, Permiso, PoliticaAcceso, UsuarioPermisosDirectos
from .catalog import Category, Product, Characteristic, SKU, MediaAsset, ProductMediaLink, SKUMediaLink
from .cms import HomepageSection
from .settings import SiteSetting
from .crm import Cotizacion, CotizacionItem
from .analytics import AnalyticsEvent
from .taller import OrdenCorte, OrdenCorteItem, EstadoOrdenCorte

# Para que SQLAlchemy/SQLModel detecte las tablas de la Nueva Arquitectura
__all__ = [
    "Persona", "TipoPersona", "CuentaAcceso", "EstadoCuenta", "Permiso", "PoliticaAcceso",
    "UsuarioPermisosDirectos", "Category", "Product", "Characteristic",
    "SKU", "HomepageSection", "SiteSetting",
    "Cotizacion", "CotizacionItem", "AnalyticsEvent",
    "OrdenCorte", "OrdenCorteItem", "EstadoOrdenCorte"
]
