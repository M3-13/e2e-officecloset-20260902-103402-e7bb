"""Tests for the outfit endpoints.

These provision their own state (users and clothing items) directly against a
throwaway SQLite file under the OS temp directory and generate JWTs with the
app's own ``create_access_token``, because the auth/items endpoints are still
owned by other tickets.
"""

import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(
    tempfile.mkdtemp(prefix="outfits-test-"), "test.db"
)
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-outfits-tests"

from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import ClothingItem, Outfit, User
from app.security import create_access_token


def _token(user_id: int) -> str:
    return create_access_token(str(user_id))


def _auth(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(user_id)}"}


def _make_user(email: str) -> User:
    db = SessionLocal()
    try:
        user = User(email=email, hashed_password="unused")
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def _make_item(user_id: int, name: str, category: str = "Oberteil") -> ClothingItem:
    db = SessionLocal()
    try:
        item = ClothingItem(name=name, category=category, user_id=user_id)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def _client() -> TestClient:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestClient(app)


def test_create_and_list_outfit() -> None:
    with _client() as client:
        user = _make_user("a@example.com")
        item = _make_item(user.id, "Bluse")

        response = client.post(
            "/api/outfits",
            json={"name": "Abendkleid", "item_ids": [item.id]},
            headers=_auth(user.id),
        )
        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "Abendkleid"
        assert [i["id"] for i in body["items"]] == [item.id]

        listing = client.get("/api/outfits", headers=_auth(user.id))
        assert listing.status_code == 200
        assert len(listing.json()) == 1
        assert listing.json()[0]["id"] == body["id"]


def test_create_rejects_foreign_items() -> None:
    with _client() as client:
        owner = _make_user("owner@example.com")
        other = _make_user("other@example.com")
        foreign = _make_item(other.id, "Fremdes Hemd")

        response = client.post(
            "/api/outfits",
            json={"name": "X", "item_ids": [foreign.id]},
            headers=_auth(owner.id),
        )
        assert response.status_code == 400


def test_create_rejects_mixed_own_and_foreign_items() -> None:
    with _client() as client:
        owner = _make_user("owner@example.com")
        other = _make_user("other@example.com")
        own = _make_item(owner.id, "Eigenes")
        foreign = _make_item(other.id, "Fremdes")

        response = client.post(
            "/api/outfits",
            json={"name": "X", "item_ids": [own.id, foreign.id]},
            headers=_auth(owner.id),
        )
        assert response.status_code == 400


def test_user_only_sees_own_outfits() -> None:
    with _client() as client:
        a = _make_user("a@example.com")
        b = _make_user("b@example.com")
        ia = _make_item(a.id, "A-Item")
        ib = _make_item(b.id, "B-Item")

        client.post(
            "/api/outfits", json={"name": "A-Outfit", "item_ids": [ia.id]}, headers=_auth(a.id)
        )
        client.post(
            "/api/outfits", json={"name": "B-Outfit", "item_ids": [ib.id]}, headers=_auth(b.id)
        )

        result = client.get("/api/outfits", headers=_auth(a.id))
        assert result.status_code == 200
        assert [o["name"] for o in result.json()] == ["A-Outfit"]


def test_foreign_outfit_is_404_for_get_put_delete() -> None:
    with _client() as client:
        a = _make_user("a@example.com")
        b = _make_user("b@example.com")
        ib = _make_item(b.id, "B-Item")

        created = client.post(
            "/api/outfits",
            json={"name": "B-Outfit", "item_ids": [ib.id]},
            headers=_auth(b.id),
        ).json()
        outfit_id = created["id"]

        assert client.get(f"/api/outfits/{outfit_id}", headers=_auth(a.id)).status_code == 404
        assert (
            client.put(
                f"/api/outfits/{outfit_id}",
                json={"name": "Hack", "item_ids": []},
                headers=_auth(a.id),
            ).status_code
            == 404
        )
        assert client.delete(f"/api/outfits/{outfit_id}", headers=_auth(a.id)).status_code == 404


def test_get_outfit_returns_items_with_image_url() -> None:
    with _client() as client:
        user = _make_user("a@example.com")
        item = _make_item(user.id, "Hemd")
        db = SessionLocal()
        try:
            stored = db.get(ClothingItem, item.id)
            stored.image_path = "uploads/1/1.png"
            db.commit()
        finally:
            db.close()

        created = client.post(
            "/api/outfits",
            json={"name": "A", "item_ids": [item.id]},
            headers=_auth(user.id),
        ).json()

        fetched = client.get(f"/api/outfits/{created['id']}", headers=_auth(user.id))
        assert fetched.status_code == 200
        assert fetched.json()["items"][0]["image_url"] == f"/api/items/{item.id}/image"


def test_item_without_image_has_null_url() -> None:
    with _client() as client:
        user = _make_user("a@example.com")
        item = _make_item(user.id, "Hemd")

        response = client.post(
            "/api/outfits",
            json={"name": "A", "item_ids": [item.id]},
            headers=_auth(user.id),
        )
        assert response.status_code == 201
        assert response.json()["items"][0]["image_url"] is None


def test_update_outfit_replaces_name_and_items() -> None:
    with _client() as client:
        user = _make_user("a@example.com")
        i1 = _make_item(user.id, "Hemd")
        i2 = _make_item(user.id, "Hose", "Hose")

        created = client.post(
            "/api/outfits",
            json={"name": "A", "item_ids": [i1.id]},
            headers=_auth(user.id),
        ).json()
        outfit_id = created["id"]

        response = client.put(
            f"/api/outfits/{outfit_id}",
            json={"name": "B", "item_ids": [i2.id]},
            headers=_auth(user.id),
        )
        assert response.status_code == 200
        assert response.json()["name"] == "B"
        assert [i["id"] for i in response.json()["items"]] == [i2.id]

        assert client.delete(f"/api/outfits/{outfit_id}", headers=_auth(user.id)).status_code == 204
        assert client.get(f"/api/outfits/{outfit_id}", headers=_auth(user.id)).status_code == 404


def test_update_rejects_foreign_items() -> None:
    with _client() as client:
        owner = _make_user("owner@example.com")
        other = _make_user("other@example.com")
        own = _make_item(owner.id, "Eigenes")
        foreign = _make_item(other.id, "Fremdes")

        created = client.post(
            "/api/outfits",
            json={"name": "A", "item_ids": [own.id]},
            headers=_auth(owner.id),
        ).json()

        response = client.put(
            f"/api/outfits/{created['id']}",
            json={"name": "A", "item_ids": [foreign.id]},
            headers=_auth(owner.id),
        )
        assert response.status_code == 400


def test_delete_removes_outfit() -> None:
    with _client() as client:
        user = _make_user("a@example.com")
        item = _make_item(user.id, "Hemd")
        created = client.post(
            "/api/outfits",
            json={"name": "A", "item_ids": [item.id]},
            headers=_auth(user.id),
        ).json()

        assert (
            client.delete(f"/api/outfits/{created['id']}", headers=_auth(user.id)).status_code
            == 204
        )
        assert (
            client.get(f"/api/outfits/{created['id']}", headers=_auth(user.id)).status_code == 404
        )

        db = SessionLocal()
        try:
            assert db.get(Outfit, created["id"]) is None
        finally:
            db.close()


def test_unauthenticated_is_rejected() -> None:
    with _client() as client:
        assert client.get("/api/outfits").status_code == 401
        assert client.post("/api/outfits", json={"name": "X", "item_ids": []}).status_code == 401
        assert client.get("/api/outfits/1").status_code == 401
        assert client.put("/api/outfits/1", json={"name": "X", "item_ids": []}).status_code == 401
        assert client.delete("/api/outfits/1").status_code == 401
