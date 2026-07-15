import os

os.environ.setdefault("LLM_PROVIDER", "ollama")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Not using TestClient as a context manager deliberately: that would fire the
    # app's startup event (init_db against the real file DB, seed_reference_docs
    # pulling the embedding model) which these tests don't need and shouldn't
    # depend on network/model availability for.
    test_client = TestClient(app)
    yield test_client

    app.dependency_overrides.clear()
