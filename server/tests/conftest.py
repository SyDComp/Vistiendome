import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event
from app.main import app
from app.api.deps import get_session
from sqlalchemy.pool import StaticPool

# Create an in-memory SQLite database for testing
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)

# SQLite no tiene `nextval(secuencia)`: es una funcion de Postgres, y el
# codigo real la usa para el correlativo humano de la cotizacion
# (Cotizacion.numero). Sin esto, CUALQUIER prueba que pase por
# `POST /api/v1/crm/` -no solo las de este archivo- muere con
# "no such function: nextval" antes de llegar a lo que se quiere probar.
#
# Se registra como funcion SQL propia de sqlite3, con un contador en memoria
# por nombre de secuencia. No toca el codigo de produccion: alli sigue
# siendo Postgres real: aca es solo aca es solo un reemplazo para el motor
# de prueba.
_contadores_secuencia = {}

@event.listens_for(engine, "connect")
def _registrar_nextval(conexion_dbapi, _):
    def nextval(nombre_secuencia):
        actual = _contadores_secuencia.get(nombre_secuencia, 0) + 1
        _contadores_secuencia[nombre_secuencia] = actual
        return actual
    conexion_dbapi.create_function("nextval", 1, nextval)

@pytest.fixture(name="session")
def session_fixture():
    # Cada prueba parte de secuencias limpias, igual que parte de tablas
    # limpias mas abajo.
    _contadores_secuencia.clear()
    # Create all tables in the memory db
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    # Drop all tables after the test
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    # El limite de pedidos publicos vive en memoria del proceso: sin esto, las
    # pruebas se lo gastarian entre ellas y fallarian segun el orden.
    from app.api.v1.crm import _LIMITE_PEDIDOS
    _LIMITE_PEDIDOS._marcas.clear()
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="cuenta_admin")
def cuenta_admin_fixture(session: Session):
    """Una cuenta del panel con el permiso de administrador, como la real."""
    from app.models.iam import CuentaAcceso, EstadoCuenta, Permiso, Persona, UsuarioPermisosDirectos

    persona = Persona(rut="99999999-9", nombres="Admin", apellidos="Prueba")
    estado = EstadoCuenta(nombre="ACTIVO")
    permiso = Permiso(recurso="SISTEMA", accion="ADMINISTRAR")
    session.add_all([persona, estado, permiso])
    session.commit()
    cuenta = CuentaAcceso(persona_id=persona.id, email_corporativo="admin@prueba.cl",
                          password_hash="-", estado_id=estado.id)
    session.add(cuenta)
    session.commit()
    session.add(UsuarioPermisosDirectos(cuenta_id=cuenta.id, permiso_id=permiso.id))
    session.commit()
    session.refresh(cuenta)
    return cuenta


@pytest.fixture(name="client_admin")
def client_admin_fixture(client: TestClient, cuenta_admin):
    """El mismo cliente, entrando con un token de verdad: pasa por el control real de permisos."""
    from app.core.security import create_access_token

    client.headers["Authorization"] = f"Bearer {create_access_token(cuenta_admin.id)}"
    return client
