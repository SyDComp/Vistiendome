from app.database import engine
from sqlmodel import Session, select
from app.models.catalog import SKU, Characteristic

with Session(engine) as db:
    attrs = db.exec(select(Characteristic).where(Characteristic.name == 'COLOR')).all()
    print("--- COLOR ATTR ---")
    for a in attrs:
        print(f"Name: {a.name}, Domain: {a.domain}")
