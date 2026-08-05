from app.database import engine
from sqlalchemy import text

def migrate_transporte():
    with engine.begin() as conn:
        print("Migrando columna 'transporte' en 'cotizaciones'...")
        try:
            # PostgreSQL requires explicit cast when changing from ENUM to VARCHAR
            conn.execute(text("ALTER TABLE cotizaciones ALTER COLUMN transporte TYPE VARCHAR(100) USING transporte::text;"))
            print("✔️ Columna convertida a texto libre con éxito.")
        except Exception as e:
            print(f"Error o ya estaba migrado: {e}")

if __name__ == "__main__":
    migrate_transporte()
