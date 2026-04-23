from .iam import Persona, CuentaAcceso, EstadoCuenta, Permiso, PoliticaAcceso, UsuarioPermisosDirectos
from .catalog import Category, Product, Characteristic, ProductOption, SKU, ProductImage

# Para que SQLAlchemy/SQLModel detecte las tablas de la Nueva Arquitectura
__all__ = [
    "Persona", "CuentaAcceso", "EstadoCuenta", "Permiso", "PoliticaAcceso", 
    "UsuarioPermisosDirectos", "Category", "Product", "Characteristic", 
    "ProductOption", "SKU", "ProductImage"
]
