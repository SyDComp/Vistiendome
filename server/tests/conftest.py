import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from app.main import app
from app.api.deps import get_session
from sqlalchemy.pool import StaticPool

# Create an in-memory SQLite database for testing
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)

@pytest.fixture(name="session")
def session_fixture():
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
