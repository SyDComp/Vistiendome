from app.database import engine
from sqlalchemy import text

def add_missing_columns():
    with engine.begin() as conn:
        print("Revisando tabla personas...")
        try:
            # Agregamos la columna tipo_persona si no existe
            conn.execute(text("ALTER TABLE personas ADD COLUMN IF NOT EXISTS tipo_persona VARCHAR(50) DEFAULT 'LEAD';"))
            print("✔️ Columna 'tipo_persona' verificada/agregada.")
            
            # Agregamos transporte_preferido por si también falta (se suelen agregar juntas)
            conn.execute(text("ALTER TABLE personas ADD COLUMN IF NOT EXISTS transporte_preferido VARCHAR(50);"))
            print("✔️ Columna 'transporte_preferido' verificada/agregada.")
            
            print("¡Actualización de base de datos completada con éxito!")
        except Exception as e:
            print(f"Error al modificar la base de datos: {e}")

if __name__ == "__main__":
    add_missing_columns()
