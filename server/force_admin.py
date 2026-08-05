from app.database import engine
from sqlmodel import Session, select
from app.models.iam import CuentaAcceso, Permiso, UsuarioPermisosDirectos

def force_admin(email: str):
    with Session(engine) as session:
        # Check user
        cuenta = session.exec(select(CuentaAcceso).where(CuentaAcceso.email_corporativo == email)).first()
        if not cuenta:
            print(f"Error: La cuenta con email '{email}' no existe en la Base de Datos.")
            return
            
        # Check/create permission
        permiso = session.exec(select(Permiso).where(Permiso.recurso == "SISTEMA").where(Permiso.accion == "ADMINISTRAR")).first()
        if not permiso:
            print("Creando permiso maestro SISTEMA:ADMINISTRAR en la BD...")
            permiso = Permiso(
                recurso="SISTEMA", 
                accion="ADMINISTRAR", 
                descripcion="Acceso total al sistema"
            )
            session.add(permiso)
            session.commit()
            session.refresh(permiso)
            
        # Check/create relation
        rel = session.exec(select(UsuarioPermisosDirectos).where(
            UsuarioPermisosDirectos.cuenta_id == cuenta.id
        ).where(
            UsuarioPermisosDirectos.permiso_id == permiso.id
        )).first()
        
        if not rel:
            print(f"Otorgando permisos de Súper Administrador a {email}...")
            rel = UsuarioPermisosDirectos(cuenta=cuenta, permiso=permiso)
            session.add(rel)
            session.commit()
            print("¡Éxito! Tu cuenta ahora tiene permisos de Dios (Súper Administrador).")
        else:
            print(f"La cuenta {email} ya tenía los permisos. (El problema debe ser otro)")

if __name__ == "__main__":
    email_admin = input("Ingresa el email con el que te estás intentando logear: ")
    force_admin(email_admin.strip())
