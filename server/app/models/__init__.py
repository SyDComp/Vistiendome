from .iam import Persona, CuentaAcceso, EstadoCuenta, Permiso, PoliticaAcceso, UsuarioPermisosDirectos
from .catalog import Category, Product, Characteristic, ProductOption, SKU, MediaAsset, ProductMediaLink, SKUMediaLink
from .cms import HomepageSection
from .settings import SiteSetting

# Para que SQLAlchemy/SQLModel detecte las tablas de la Nueva Arquitectura
__all__ = [
    "Persona", "CuentaAcceso", "EstadoCuenta", "Permiso", "PoliticaAcceso", 
    "UsuarioPermisosDirectos", "Category", "Product", "Characteristic", 
    "ProductOption", "SKU", "HomepageSection", "SiteSetting"
]
