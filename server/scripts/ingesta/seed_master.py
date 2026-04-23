import sys
import os

# Contexto de ejecución
SERVER_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(SERVER_DIR)

from sqlmodel import Session, select
from app.database import engine
from app.models.iam import EstadoCuenta, Permiso

def seed():
    with Session(engine) as session:
        # 1. Inyección de Máquinas de Estado
        estados = ['ACTIVO', 'BLOQUEADO', 'PENDIENTE_VALIDACION', 'ELIMINADO', 'ANONIMIZADO']
        for estado in estados:
            if not session.exec(select(EstadoCuenta).where(EstadoCuenta.nombre == estado)).first():
                session.add(EstadoCuenta(nombre=estado))
        
        # 2. Permisos Funcionales PBAC
        permisos_basicos = [
            ("RRHH", "VER_SUELDOS", "Sensible, requiere MFA para protección de LRE (Libro de Remuneraciones Electrónico)"),
            ("RRHH", "EDITAR_CONTRATOS", "Edición legal para el historial contractual (SCD Tipo 2)"),
            ("INVENTARIO", "VER_STOCK", "Auditoría de pañol o stock físico"),
            ("CRM", "VER_CLIENTES", "Visualización de perfiles completos de cliente")
        ]
        
        for rec, acc, desc in permisos_basicos:
            if not session.exec(select(Permiso).where(Permiso.recurso == rec, Permiso.accion == acc)).first():
                session.add(Permiso(recurso=rec, accion=acc, descripcion=desc))
                
        session.commit()
        print("Core IAM Seed Data inyectada satisfactoriamente.")

if __name__ == "__main__":
    seed()
