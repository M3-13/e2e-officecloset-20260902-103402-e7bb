"""Auth endpoint tests: register, login, wrong password, duplicate, rate limit."""

import os
from datetime import UTC, datetime

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-auth-tests"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.deps import get_db
from app.main import app
from app.routers.auth import rate_limiter
from app.security import decode_access_token

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _clean_state():
    app.dependency_overrides[get_db] = _override_get_db
    models.Base.metadata.create_all(bind=engine)
    rate_limiter.reset()
    yield
    rate_limiter.reset()
    models.Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def _register(client: TestClient, email: str = "user@example.com", password: str = "supersecret"):
    return client.post("/api/auth/register", json={"email": email, "password": password})


def test_register_returns_token() -> None:
    with TestClient(app) as client:
        response = _register(client)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_returns_token() -> None:
    with TestClient(app) as client:
        assert _register(client).status_code == 200
        response = client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "supersecret"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_returns_401() -> None:
    with TestClient(app) as client:
        assert _register(client).status_code == 200
        response = client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "wrong-password"},
        )
    assert response.status_code == 401


def test_register_duplicate_email_returns_409() -> None:
    with TestClient(app) as client:
        assert _register(client).status_code == 200
        response = _register(client)
    assert response.status_code == 409


def test_register_short_password_returns_400() -> None:
    with TestClient(app) as client:
        response = _register(client, password="short")
    assert response.status_code == 400


def test_rate_limit_returns_429_after_five_attempts() -> None:
    with TestClient(app) as client:
        responses = [
            client.post(
                "/api/auth/login",
                json={"email": "x@example.com", "password": "wrong-password"},
            )
            for _ in range(6)
        ]
    assert all(response.status_code != 429 for response in responses[:5])
    assert responses[5].status_code == 429


def test_token_carries_expiry() -> None:
    with TestClient(app) as client:
        response = _register(client)
    payload = decode_access_token(response.json()["access_token"])
    assert payload["sub"].isdigit()
    now = datetime.now(UTC).timestamp()
    assert 14 * 60 < payload["exp"] - now < 16 * 60
