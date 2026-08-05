from sqlmodel import Session, text
from app.database import engine

def migrate():
    with Session(engine) as session:
        print("Iniciando migración de apodo...")
        try:
            # Añadir la columna apodo si no existe
            session.exec(text("ALTER TABLE cuentas_acceso ADD COLUMN apodo VARCHAR(50) UNIQUE;"))
            session.commit()
            print("✔️ Columna 'apodo' añadida exitosamente.")
        except Exception as e:
            session.rollback()
            if "already exists" in str(e) or "ya existe" in str(e):
                print("⚠️ La columna 'apodo' ya existe. Ignorando.")
            else:
                print(f"❌ Error durante la migración: {e}")

if __name__ == "__main__":
    migrate()
