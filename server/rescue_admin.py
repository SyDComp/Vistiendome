import sys
from sqlmodel import Session, select
from app.database import engine
from app.models.iam import CuentaAcceso, Persona
from app.core import security

def rescue_admin():
    print("=========================================")
    print("   RESCATE MAESTRO DE ADMINISTRADORES    ")
    print("=========================================")
    print("Este script permite reestablecer forzosamente")
    print("la contraseña o listar los datos de acceso.")
    print("-----------------------------------------\n")
    
    with Session(engine) as session:
        # Obtener todos los administradores (generalmente tienen permisos o son los que gestionan la tienda)
        cuentas = session.exec(select(CuentaAcceso)).all()
        
        if not cuentas:
            print("No hay cuentas registradas en el sistema.")
            sys.exit(0)
            
        print("Cuentas actuales en el sistema:")
        for idx, c in enumerate(cuentas):
            nombre = f"{c.persona.nombres} {c.persona.apellidos}"
            print(f"[{idx}] {nombre} | Email: {c.email_corporativo} | Apodo: {c.apodo or 'NO TIENE'}")
            
        print("\n¿Deseas resetear la contraseña de alguna cuenta?")
        opcion = input("Ingresa el número de la cuenta (o presiona ENTER para salir): ")
        
        if not opcion.strip():
            print("Operación cancelada. Saliendo...")
            sys.exit(0)
            
        try:
            indice = int(opcion)
            cuenta_seleccionada = cuentas[indice]
        except (ValueError, IndexError):
            print("❌ Opción no válida.")
            sys.exit(1)
            
        nueva_password = input(f"\nIngresa la nueva contraseña para '{cuenta_seleccionada.email_corporativo}': ")
        if len(nueva_password) < 6:
            print("❌ La contraseña debe tener al menos 6 caracteres.")
            sys.exit(1)
            
        # Actualizar contraseña
        cuenta_seleccionada.password_hash = security.get_password_hash(nueva_password)
        cuenta_seleccionada.intentos_fallidos = 0  # Desbloquear por si acaso
        session.commit()
        
        print("\n✔️ Contraseña actualizada con éxito.")
        print(f"Ahora puedes iniciar sesión con:")
        print(f"Identificador: {cuenta_seleccionada.apodo or cuenta_seleccionada.email_corporativo}")
        print(f"Contraseña: {nueva_password}")

if __name__ == "__main__":
    rescue_admin()
