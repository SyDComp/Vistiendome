from fastapi.testclient import TestClient
from sqlmodel import Session
from app.models.iam import CuentaAcceso, Persona, EstadoCuenta
from app.core.security import get_password_hash

def setup_test_user(session: Session, email: str, password: str):
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
        json={"email": "test@admin.com", "password": "testpassword123"}
    )
    
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(client: TestClient, session: Session):
    setup_test_user(session, "test2@admin.com", "testpassword123")

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test2@admin.com", "password": "wrongpassword"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"
