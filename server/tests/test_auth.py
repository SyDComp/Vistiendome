"""
Entrar al panel.

EL CAMPO SE LLAMA `identificador`, NO `email`
Se puede entrar con el correo o con el apodo, y por eso el endpoint recibe un
solo campo para los dos. Estas pruebas mandaban `email` y llevaban quien sabe
cuanto devolviendo 422 sin que nadie mirara: eran las dos unicas pruebas del
backend, y las dos estaban rojas.

Se agrega la prueba del apodo, que es justamente lo que cambio el endpoint el
dia que las rompio.
"""

from fastapi.testclient import TestClient
from sqlmodel import Session
from app.models.iam import CuentaAcceso, Persona, EstadoCuenta
from app.core.security import get_password_hash

def setup_test_user(session: Session, email: str, password: str, apodo: str | None = None):
    hashed_password = get_password_hash(password)
    persona = Persona(rut="12345678-9", nombres="Test", apellidos="User")
    session.add(persona)
    session.commit()
    session.refresh(persona)

    estado = EstadoCuenta(nombre="ACTIVO")
    session.add(estado)
    session.commit()
    session.refresh(estado)

    user = CuentaAcceso(
        persona_id=persona.id,
        email_corporativo=email,
        apodo=apodo,
        password_hash=hashed_password,
        estado_id=estado.id
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def test_login_success(client: TestClient, session: Session):
    setup_test_user(session, "test@admin.com", "testpassword123")

    response = client.post(
        "/api/v1/auth/login",
        json={"identificador": "test@admin.com", "password": "testpassword123"}
    )
    
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(client: TestClient, session: Session):
    setup_test_user(session, "test2@admin.com", "testpassword123")

    response = client.post(
        "/api/v1/auth/login",
        json={"identificador": "test2@admin.com", "password": "wrongpassword"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"


def test_login_con_apodo(client: TestClient, session: Session):
    """Entrar con el apodo en vez del correo: es la otra mitad del endpoint."""
    setup_test_user(session, "test3@admin.com", "testpassword123", apodo="usuaria_prueba")

    response = client.post(
        "/api/v1/auth/login",
        json={"identificador": "usuaria_prueba", "password": "testpassword123"}
    )

    assert response.status_code == 200, response.text
    assert "access_token" in response.json()


def test_login_usuario_inexistente(client: TestClient):
    """Quien no existe recibe lo MISMO que quien erro la clave.

    Si el mensaje fuera distinto, cualquiera podria averiguar que correos estan
    registrados probandolos de a uno."""
    response = client.post(
        "/api/v1/auth/login",
        json={"identificador": "nadie@ejemplo.com", "password": "loquesea"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"
