from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    APP_NAME: str = "Vistiendomé API"
    # POR DEFECTO, PRODUCCION. A proposito.
    #
    # De este valor cuelga si borrar un producto es fisico o logico: en dev el
    # borrado arrasa el producto, sus SKU y TODOS sus StockMovement, o sea el
    # historial de ventas. Con "development" por defecto, cualquier despliegue
    # que se olvide de pasar la variable queda en el modo destructivo sin que
    # nadie lo note.
    #
    # Ya paso: el .env del servidor decia production, pero el compose no le
    # pasaba APP_ENV al contenedor y adentro no hay .env que leer. La API
    # corria con is_dev=True en produccion.
    #
    # El modo peligroso ahora hay que pedirlo explicitamente.
    APP_ENV: str = "production" # development | production
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    @property
    def is_dev(self) -> bool:
        return self.APP_ENV == "development"

    class Config:
        env_file = ".env"
        case_sensitive = True
        # EL .env TIENE MAS COSAS QUE ESTA CLASE, Y ESTA BIEN
        # Ahi viven tambien POSTGRES_USER, POSTGRES_DB y lo que necesite
        # docker-compose. Sin esto, pydantic tomaba cada clave que no fuera un
        # campo de aqui como un error y la aplicacion no arrancaba: pasaba al
        # correr el servidor desde la raiz del proyecto, donde SI hay .env.
        # En el contenedor no se notaba porque adentro no hay .env que leer.
        extra = "ignore"

settings = Settings()
