import sys
import os
import re
from sqlmodel import Session, select
sys.path.append(os.path.abspath('.'))
from app.database import engine
from app.models.catalog import Category

FILE_PATH = os.path.abspath("./recursos/categorias_reales/categoriasDefinitivas.md")

def slugify(name, parent_slug=None):
    clean = name.lower().strip()
    clean = re.sub(r'[^\w\s-]', '', clean)
    slug = re.sub(r'[-\s]+', '-', clean)
    if parent_slug:
        return f"{parent_slug}-{slug}"
    return slug

def parse_md_hierarchy(content):
    raw_blocks = content.split("///")
    blocks = []
    for rb in raw_blocks:
        lines = [l.strip() for l in rb.split('\n') if l.strip()]
        if lines:
            blocks.append({
                "parent": lines[0],
                "children": lines[1:]
            })
    return blocks

def ingest():
    if not os.path.exists(FILE_PATH):
        print(f"Error: No se encuentra el archivo {FILE_PATH}")
        return

    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    blocks = parse_md_hierarchy(content)
    
    with Session(engine) as session:
        for block in blocks:
            parent_name = block["parent"]
            children = block["children"]
            
            print(f"Procesando bloque: {parent_name} -> {len(children)} hijos")
            
            parent_id = None
            parent_slug_base = None
            
            if parent_name != "1":
                # Normalizar nombre del padre para búsqueda
                display_parent_name = parent_name.title()
                stmt = select(Category).where(Category.name.ilike(parent_name))
                parent_obj = session.exec(stmt).first()
                if parent_obj:
                    parent_id = parent_obj.id
                    parent_slug_base = parent_obj.slug
                    # Actualizar nombre si no está normalizado
                    parent_obj.name = display_parent_name
                    session.add(parent_obj)
                else:
                    # Crear raíz
                    print(f"  + Auto-creando padre raíz: {display_parent_name}")
                    slug = slugify(parent_name)
                    stmt_slug = select(Category).where(Category.slug == slug)
                    existing = session.exec(stmt_slug).first()
                    if existing:
                        parent_obj = existing
                        parent_obj.name = display_parent_name
                    else:
                        parent_obj = Category(name=display_parent_name, slug=slug, parent_id=None)
                    
                    session.add(parent_obj)
                    session.commit()
                    session.refresh(parent_obj)
                    parent_id = parent_obj.id
                    parent_slug_base = parent_obj.slug

            for child_name in children:
                display_child_name = child_name.title()
                child_slug = slugify(child_name, parent_slug_base)
                
                # Buscar por SLUG exacto
                stmt = select(Category).where(Category.slug == child_slug)
                cat = session.exec(stmt).first()
                
                if not cat:
                    cat = Category(name=display_child_name, slug=child_slug, parent_id=parent_id)
                    session.add(cat)
                    print(f"  + Creada: {display_child_name} (slug: {child_slug})")
                else:
                    cat.parent_id = parent_id
                    cat.name = display_child_name # Normalizar nombre
                    session.add(cat)
                    print(f"  = Normalizada: {display_child_name}")
                
                # Commit después de cada hijo para evitar Deadlocks o inconsistencias
                session.commit()

    print("\nIngesta de jerarquía completada.")

if __name__ == "__main__":
    ingest()
