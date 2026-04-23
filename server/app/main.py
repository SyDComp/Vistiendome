from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import init_db
from .api.v1 import auth, products, admin, websockets, media, catalog_admin

app = FastAPI(
    title="Vistiéndome API",
    description="Motor de e-commerce profesional para Vistiéndome Chile",
    version="1.0.0"
)

# --- MIDDLEWARE (Prioridad Alta) ---
# Configuramos CORS antes que cualquier ruta para asegurar que OPTIONS funcione
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Temporalmente abierto para diagnóstico total
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- RUTAS ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Catálogo Público"])
app.include_router(catalog_admin.router, prefix="/api/v1/admin/catalog", tags=["Gestión de Catálogo"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Administración"])
app.include_router(media.router, prefix="/api/v1/media", tags=["Medios"])
app.include_router(websockets.router, prefix="/ws", tags=["websockets"])

# Servir archivos estáticos
if not os.path.exists("media"):
    os.makedirs("media")
app.mount("/media", StaticFiles(directory="media"), name="media")

@app.on_event("startup")
def on_startup():
    """Inicialización automatizada de tablas al arrancar el contenedor"""
    try:
        init_db()
    except Exception as e:
        print(f"Error en init_db: {e}")

@app.get("/")
def read_root():
    return {"message": "Vistiéndome API se encuentra operativa 🚀"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "vistiendome-backend"}
