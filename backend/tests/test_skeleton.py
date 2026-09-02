"""Skeleton tests: health, router registration and dependency presence.

These assert only what the scaffold itself delivers — that the app boots, the
health endpoint answers, every router is wired, and the auth dependency exists.
Stub response bodies (501) are never asserted, as those belong to other tickets.
"""

import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-skeleton-tests"

from fastapi.testclient import TestClient

from app import deps
from app.main import app

EXPECTED_ROUTES: dict[str, set[str]] = {
    "/api/auth/register": {"post"},
    "/api/auth/login": {"post"},
    "/api/users/me": {"delete"},
    "/api/items": {"get", "post"},
    "/api/items/{item_id}": {"get", "put", "delete"},
    "/api/items/{item_id}/image": {"get"},
    "/api/outfits": {"get", "post"},
    "/api/outfits/{outfit_id}": {"get", "put", "delete"},
    "/api/health": {"get"},
}


def test_health_returns_200() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_all_routers_are_registered() -> None:
    paths = app.openapi()["paths"]
    missing = [
        f"{method.upper()} {path}"
        for path, methods in EXPECTED_ROUTES.items()
        for method in methods
        if path not in paths or method not in paths[path]
    ]
    assert not missing, f"routes not registered: {missing}"


def test_get_current_user_is_present() -> None:
    assert callable(deps.get_current_user)


def test_protected_routes_reject_unauthenticated() -> None:
    with TestClient(app) as client:
        assert client.get("/api/items").status_code == 401
        assert client.get("/api/outfits").status_code == 401
        assert client.delete("/api/users/me").status_code == 401
