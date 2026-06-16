from app.database import engine
from sqlmodel import Session, select
from app.models.catalog import SKU, Characteristic

with Session(engine) as db:
    skus = db.exec(select(SKU).limit(2)).all()
    print("--- SKUS ---")
    for s in skus:
        print(s.config)
        
    attrs = db.exec(select(Characteristic).limit(5)).all()
    print("--- ATTRS ---")
    for a in attrs:
        print(f"Name: {a.name}, Domain: {a.domain}")
