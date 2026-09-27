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
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
