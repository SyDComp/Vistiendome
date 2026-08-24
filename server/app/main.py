from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import init_db
from .api.v1 import auth, products, admin, websockets, media, catalog_admin, catalog_collections, collections, cms, settings as site_settings, crm, geo, analytics

app = FastAPI(
    title="Vistiendomé API",
    description="Motor de e-commerce profesional para Vistiendomé Chile",
    version="1.0.0"
)

# --- MIDDLEWARE (Prioridad Alta) ---
# Configuramos CORS antes que cualquier ruta para asegurar que OPTIONS funcione
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","), 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- RUTAS ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Catálogo Público"])
app.include_router(collections.router, prefix="/api/v1/collections", tags=["Colecciones Públicas"])
app.include_router(cms.router, prefix="/api/v1/homepage", tags=["CMS de Portada"])
app.include_router(catalog_admin.router, prefix="/api/v1/admin/catalog", tags=["Gestión de Catálogo"])
app.include_router(catalog_collections.router, prefix="/api/v1/admin/catalog", tags=["Colecciones"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Administración"])
app.include_router(site_settings.router, prefix="/api/v1/settings", tags=["Configuraciones"])
app.include_router(media.router, prefix="/api/v1/media", tags=["Medios"])
app.include_router(crm.router, prefix="/api/v1/crm", tags=["CRM y Cotizaciones"])
app.include_router(geo.router, prefix="/api/v1/geo", tags=["Geografía"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Inteligencia de Negocio"])
app.include_router(websockets.router, prefix="/ws", tags=["websockets"])

class MediaEstatica(StaticFiles):
    """
    Sirve /media diciéndole al navegador cuánto puede guardarse la imagen.

    Sin `Cache-Control` sólo había `etag`/`last-modified`, así que en cada
    visita el navegador volvía a preguntar por cada foto: no re-descargaba
    (recibía 304) pero pagaba el viaje de ida y vuelta por imagen, que con mala
    señal es justo lo que se siente.

    Una semana es deliberado y no "para siempre": las fotos nuevas llegan con
    nombre único (UUID), pero las que ya estaban tienen nombre legible
    (`vestido_noemi_coral.jpg`). Si alguna se reemplazara conservando el
    nombre, una caché eterna la dejaría vieja para siempre; así se corrige sola.
    """
    def file_response(self, *args, **kwargs):
        respuesta = super().file_response(*args, **kwargs)
        respuesta.headers["Cache-Control"] = "public, max-age=604800"
        return respuesta


# Servir archivos estáticos
if not os.path.exists("media"):
    os.makedirs("media")
app.mount("/media", MediaEstatica(directory="media"), name="media")

@app.on_event("startup")
def on_startup():
    """Inicialización automatizada de tablas al arrancar el contenedor"""
    try:
        init_db()
    except Exception as e:
        print(f"Error en init_db: {e}")

@app.get("/")
def read_root():
    return {"message": "Vistiendomé API se encuentra operativa 🚀"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "vistiendome-backend"}
