"""
Entrar al panel una sola vez: abre una ventana en el ingreso, la persona
entra con su correo y contraseña, y la sesión queda guardada en
docs/manual/.sesion.json (fuera de git) para que las capturas corran solas.

uso (desde docs/manual):  .venv/Scripts/python.exe -m capturador.sesion
"""
from .navegador import SESION, SITIO, pagina

ESPERA_MS = 5 * 60 * 1000


def main():
    with pagina(con_ventana=True, con_sesion=False) as p:
        p.goto(f"{SITIO}/admin/login")
        print("Entra al panel en la ventana que se abrió (tienes 5 minutos).")
        p.wait_for_url("**/admin/dashboard**", timeout=ESPERA_MS)
        p.context.storage_state(path=str(SESION))
        print(f"Sesión guardada en {SESION}. Ya puedes cerrar la ventana.")


if __name__ == "__main__":
    main()
