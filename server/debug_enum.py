from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        res = conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'movementtype'")).fetchall()
        print('Enum values (movementtype):', res)
    except Exception as e:
        print("Error checking enum:", e)

    res = conn.execute(text("SELECT id, name, specs FROM product WHERE name ILIKE '%Priscila%'")).mappings().first()
    print("Priscila ID:", res['id'] if res else "Not found")
