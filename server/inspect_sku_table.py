from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'sku'"))
    for r in res.fetchall():
        print(f"Column: {r[0]}, Nullable: {r[1]}, Type: {r[2]}")
