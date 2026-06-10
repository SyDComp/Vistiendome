import os
import mimetypes
from sqlmodel import Session, select, SQLModel
from app.database import engine
from app.models.catalog import MediaAsset

UPLOAD_DIR = "media"

def sync():
    if not os.path.exists(UPLOAD_DIR):
        print("Carpeta media no existe. No hay nada que sincronizar.")
        return

    print("Creando tablas nuevas en la base de datos si no existen...")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as db:
        # Obtenemos los assets que ya están en base de datos para no duplicar
        existing = {a.filename for a in db.exec(select(MediaAsset)).all()}
        count = 0
        
        for f in os.listdir(UPLOAD_DIR):
            file_path = os.path.join(UPLOAD_DIR, f)
            if os.path.isfile(file_path) and f not in existing:
                print(f"Indexando archivo: {f}...")
                mime_type, _ = mimetypes.guess_type(file_path)
                asset = MediaAsset(
                    filename=f,
                    original_name=f,
                    url=f"/media/{f}",
                    mime_type=mime_type or "image/jpeg",
                    file_size=os.path.getsize(file_path)
                )
                db.add(asset)
                count += 1
                
        db.commit()
        print(f"Sincronización completada. Se añadieron {count} nuevos MediaAssets a la base de datos.")

if __name__ == "__main__":
    sync()
