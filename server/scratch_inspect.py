import os
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg://postgres:vistiendome2024@127.0.0.1:5433/postgres"
engine = create_engine(DATABASE_URL)

def run():
    print("Buscando atributo Color...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM attribute WHERE name = 'Color';")).fetchone()
        if result:
            print(f"Color: {result._mapping}")
        else:
            print("Color no encontrado")
            # Let's list all attributes
            res2 = conn.execute(text("SELECT * FROM attribute;")).fetchall()
            print("Todos los atributos:")
            for r in res2:
                print(r._mapping)

if __name__ == "__main__":
    run()
