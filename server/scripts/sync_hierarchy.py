import sys
import os
from sqlmodel import Session, select
sys.path.append(os.path.abspath('.'))
from app.database import engine
from app.models.catalog import Category

def sync_hierarchy():
    print("Iniciando reorganizacion de categorias...")
    
    with Session(engine) as session:
        # 1. Asegurar categorias de nivel superior
        top_levels = ["Vestimenta", "Accesorios", "Lecturas"]
        parents = {}
        
        for name in top_levels:
            slug = name.lower()
            statement = select(Category).where(Category.slug == slug)
            cat = session.exec(statement).first()
            if not cat:
                cat = Category(name=name, slug=slug, parent_id=None)
                session.add(cat)
                session.commit()
                session.refresh(cat)
                print(f"Creada categoria raiz: {name}")
            parents[name] = cat

        # 2. Mover categorias huerfanas bajo 'Vestimenta' por defecto
        # (A menos que ya sean raices nosotros mismos)
        vestimenta_id = parents["Vestimenta"].id
        
        statement = select(Category).where(Category.parent_id == None)
        all_orphans = session.exec(statement).all()
        
        for cat in all_orphans:
            # Si no es uno de los top levels creados arriba
            if cat.id != vestimenta_id and cat.slug not in [t.lower() for t in top_levels]:
                cat.parent_id = vestimenta_id
                session.add(cat)
                print(f"Asignando '{cat.name}' bajo 'Vestimenta'")
        
        session.commit()
    print("Sincronizacion de jerarquia completada.")

if __name__ == "__main__":
    sync_hierarchy()
