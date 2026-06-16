from sqlmodel import Session, create_engine, select, SQLModel
from app.models.cms import HelpSection, HomepageSection
from app.database import engine

def init_cms():
    print("Iniciando creación de tablas...")
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. Inicializar secciones de ayuda si no existen
        print("Verificando secciones de ayuda...")
        help_sections = [
            ("tallas", "Guía de Tallas", "📏"),
            ("faq", "Preguntas Frecuentes", "❓"),
            ("cambios", "Cambios y Devoluciones", "🔄"),
            ("envios", "Envíos y Seguimiento", "🚚"),
            ("cuidados", "Cuidado de Prendas", "✨"),
        ]
        
        for slug, title, icon in help_sections:
            existing = session.exec(select(HelpSection).where(HelpSection.slug == slug)).first()
            if not existing:
                db_section = HelpSection(slug=slug, title=title, icon=icon, order=help_sections.index((slug, title, icon)))
                session.add(db_section)
                
                # Crear un bloque de ejemplo para cada sección (opcional, para que no estén vacías)
                # Guía de tallas con una tabla de ejemplo
                if slug == 'tallas':
                    table_config = {
                        "headers": ["Talla", "Pecho", "Cintura"],
                        "rows": [
                            {"Talla": "M", "Pecho": "95", "Cintura": "80"},
                            {"Talla": "L", "Pecho": "105", "Cintura": "90"}
                        ]
                    }
                    session.add(HomepageSection(page=slug, type='data_table', title='Tabla de Datos', config=table_config, order=0))
                else:
                    session.add(HomepageSection(page=slug, type='text_post', title='Información General', config={"content": f"Contenido de {title} en edición..."}, order=0))

        # 2. Asegurar que los bloques existentes tengan page='homepage'
        print("Sincronizando bloques existentes...")
        blocks = session.exec(select(HomepageSection)).all()
        for b in blocks:
            # En SQLAlchemy/SQLModel, si la columna se añadió recién, 
            # puede que necesitemos forzar el valor si es None
            try:
                if not getattr(b, 'page', None):
                    b.page = "homepage"
                    session.add(b)
            except Exception:
                # Si la columna no existe aún en la base de datos (pese a create_all)
                # en Postgres a veces create_all no añade columnas a tablas existentes.
                # Intentaremos un ALTER TABLE simple si falla.
                pass
        
        session.commit()
        print("Migración CMS completada con éxito.")

if __name__ == "__main__":
    init_cms()
