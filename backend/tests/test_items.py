"""Tests for clothing-item CRUD, image upload and strict per-user isolation."""

import itertools
import os
import tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = (
    f"sqlite:///{(Path(tempfile.mkdtemp(prefix='items_db_')) / 'test.db').as_posix()}"
)
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-items-tests-0123456789abcdef"
os.environ["UPLOAD_DIR"] = str(Path(tempfile.mkdtemp(prefix="items_uploads_")))
os.environ["MAX_UPLOAD_MB"] = "1"

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.datastructures import Headers, UploadFile

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import User
from app.security import create_access_token
from app.upload import enforce_upload_size_limit, save_image

_counter = itertools.count()


def _image_path(user_id: int, item_id: int, extension: str) -> Path:
    return Path(settings.upload_dir) / str(user_id) / f"{item_id}{extension}"


def _create_user() -> User:
    db = SessionLocal()
    try:
        user = User(email=f"user{next(_counter)}@example.com", hashed_password="not-a-real-hash")
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def _auth_headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def test_create_item_requires_auth(client) -> None:
    resp = client.post("/api/items", data={"name": "Hemd", "category": "Oberteil"})
    assert resp.status_code == 401


def test_create_item_without_image(client) -> None:
    user = _create_user()
    resp = client.post(
        "/api/items",
        data={"name": "Hemd", "category": "Oberteil"},
        headers=_auth_headers(user),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Hemd"
    assert body["category"] == "Oberteil"
    assert body["image_url"] is None


def test_create_item_with_image_and_serve_it(client) -> None:
    user = _create_user()
    png = b"\x89PNG\r\n\x1a\nfake-image-bytes"
    resp = client.post(
        "/api/items",
        data={"name": "Kleid", "category": "Kleid"},
        files={"image": ("kleid.png", png, "image/png")},
        headers=_auth_headers(user),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["image_url"] == f"/api/items/{body['id']}/image"

    image_resp = client.get(body["image_url"], headers=_auth_headers(user))
    assert image_resp.status_code == 200
    assert image_resp.content == png
    assert image_resp.headers["content-type"].startswith("image/png")


def test_list_items_filters_by_category_and_isolation(client) -> None:
    user_a = _create_user()
    user_b = _create_user()
    ha = _auth_headers(user_a)
    hb = _auth_headers(user_b)

    client.post("/api/items", data={"name": "Hemd", "category": "Oberteil"}, headers=ha)
    client.post("/api/items", data={"name": "Hose", "category": "Hose"}, headers=ha)
    client.post("/api/items", data={"name": "HoseB", "category": "Hose"}, headers=hb)

    all_a = client.get("/api/items", headers=ha).json()
    assert [item["name"] for item in all_a] == ["Hemd", "Hose"]

    hosen = client.get("/api/items", params={"category": "Hose"}, headers=ha).json()
    assert [item["name"] for item in hosen] == ["Hose"]

    all_b = client.get("/api/items", headers=hb).json()
    assert [item["name"] for item in all_b] == ["HoseB"]


def test_create_item_invalid_category(client) -> None:
    user = _create_user()
    resp = client.post(
        "/api/items",
        data={"name": "X", "category": "Ungueltig"},
        headers=_auth_headers(user),
    )
    assert resp.status_code == 400
    assert client.get("/api/items", headers=_auth_headers(user)).json() == []


def test_create_item_invalid_image_type(client) -> None:
    user = _create_user()
    headers = _auth_headers(user)
    resp = client.post(
        "/api/items",
        data={"name": "X", "category": "Oberteil"},
        files={"image": ("x.gif", b"GIF89a", "image/gif")},
        headers=headers,
    )
    assert resp.status_code == 400
    assert client.get("/api/items", headers=headers).json() == []


def test_create_item_too_large_image(client) -> None:
    user = _create_user()
    headers = _auth_headers(user)
    big = b"x" * (1024 * 1024 + 512)
    resp = client.post(
        "/api/items",
        data={"name": "X", "category": "Oberteil"},
        files={"image": ("big.png", big, "image/png")},
        headers=headers,
    )
    assert resp.status_code == 413
    assert client.get("/api/items", headers=headers).json() == []


def test_get_item_and_foreign_access_is_404(client) -> None:
    user_a = _create_user()
    user_b = _create_user()
    ha = _auth_headers(user_a)
    hb = _auth_headers(user_b)
    created = client.post(
        "/api/items", data={"name": "Hemd", "category": "Oberteil"}, headers=ha
    ).json()

    assert client.get(f"/api/items/{created['id']}", headers=ha).status_code == 200
    assert client.get(f"/api/items/{created['id']}", headers=hb).status_code == 404
    assert client.get("/api/items/999999", headers=ha).status_code == 404


def test_update_item_replaces_image_and_removes_old_file(client) -> None:
    user = _create_user()
    headers = _auth_headers(user)
    created = client.post(
        "/api/items",
        data={"name": "Hemd", "category": "Oberteil"},
        files={"image": ("a.png", b"png-a", "image/png")},
        headers=headers,
    ).json()

    old_path = _image_path(user.id, created["id"], ".png")
    assert old_path.is_file()

    updated = client.put(
        f"/api/items/{created['id']}",
        data={"name": "Bluse", "category": "Oberteil"},
        files={"image": ("b.webp", b"webp-b", "image/webp")},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Bluse"
    assert updated.json()["image_url"] == f"/api/items/{created['id']}/image"

    assert not old_path.is_file()
    new_path = _image_path(user.id, created["id"], ".webp")
    assert new_path.is_file()


def test_update_item_keeps_image_when_no_new_image(client) -> None:
    user = _create_user()
    headers = _auth_headers(user)
    created = client.post(
        "/api/items",
        data={"name": "Hemd", "category": "Oberteil"},
        files={"image": ("a.png", b"png-a", "image/png")},
        headers=headers,
    ).json()

    updated = client.put(
        f"/api/items/{created['id']}",
        data={"name": "Neu", "category": "Hose"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Neu"
    assert updated.json()["image_url"] == f"/api/items/{created['id']}/image"
    assert _image_path(user.id, created["id"], ".png").is_file()


def test_delete_item_removes_item_and_image(client) -> None:
    user = _create_user()
    headers = _auth_headers(user)
    created = client.post(
        "/api/items",
        data={"name": "Hemd", "category": "Oberteil"},
        files={"image": ("a.png", b"png-a", "image/png")},
        headers=headers,
    ).json()
    path = _image_path(user.id, created["id"], ".png")
    assert path.is_file()

    resp = client.delete(f"/api/items/{created['id']}", headers=headers)
    assert resp.status_code == 204
    assert not path.is_file()
    assert client.get("/api/items", headers=headers).json() == []


def test_delete_and_image_foreign_access_is_404(client) -> None:
    user_a = _create_user()
    user_b = _create_user()
    ha = _auth_headers(user_a)
    hb = _auth_headers(user_b)
    created = client.post(
        "/api/items",
        data={"name": "Hemd", "category": "Oberteil"},
        files={"image": ("a.png", b"png-a", "image/png")},
        headers=ha,
    ).json()

    assert client.get(f"/api/items/{created['id']}/image", headers=hb).status_code == 404
    assert client.delete(f"/api/items/{created['id']}", headers=hb).status_code == 404


def test_get_image_missing_returns_404(client) -> None:
    user = _create_user()
    headers = _auth_headers(user)
    created = client.post(
        "/api/items", data={"name": "Hemd", "category": "Oberteil"}, headers=headers
    ).json()
    assert client.get(f"/api/items/{created['id']}/image", headers=headers).status_code == 404


class FakeRequest:
    def __init__(self, content_length: str | None) -> None:
        self.headers = {"content-length": content_length} if content_length is not None else {}


def test_enforce_upload_size_limit_rejects_oversized_header() -> None:
    with pytest.raises(HTTPException) as exc_info:
        enforce_upload_size_limit(FakeRequest(str(1024 * 1024 + 1)))
    assert exc_info.value.status_code == 413


def test_enforce_upload_size_limit_allows_small_or_missing_header() -> None:
    enforce_upload_size_limit(FakeRequest("100"))
    enforce_upload_size_limit(FakeRequest(None))


def test_save_image_rejects_oversized_content(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    with tempfile.SpooledTemporaryFile(max_size=1024 * 1024) as file:
        upload = UploadFile(
            file=file,
            filename="big.png",
            headers=Headers({"content-type": "image/png"}),
        )
        upload.file.write(b"x" * (1024 * 1024 + 1))
        upload.file.seek(0)

        with pytest.raises(HTTPException) as exc_info:
            save_image(upload, user_id=1, item_id=1, extension=".png")
        assert exc_info.value.status_code == 413
        assert not (tmp_path / "1" / "1.png").exists()
