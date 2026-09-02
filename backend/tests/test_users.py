"""Account-deletion tests.

Verify that ``DELETE /api/users/me`` removes the authenticated user together
with every clothing item, outfit, association row and uploaded image file.
"""

import os
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Match the scaffold's in-memory default so a shared module-level engine is
# never pointed at a real ``dev.db`` file regardless of import order.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-users-tests-0123456789abcdef"

_TEST_TMP = tempfile.mkdtemp(prefix="users_test_")
os.environ["UPLOAD_DIR"] = os.path.join(_TEST_TMP, "uploads")

from app.deps import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import ClothingItem, Outfit, User, outfit_items  # noqa: E402
from app.security import create_access_token, hash_password  # noqa: E402

UPLOAD_DIR = Path(os.environ["UPLOAD_DIR"])

# A single in-memory SQLite connection shared across every thread, so data
# seeded by the test thread is visible to the app's request handlers.
TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


def _override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _reset_state():
    from app.models import Base

    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)
    if UPLOAD_DIR.exists():
        for child in UPLOAD_DIR.iterdir():
            if child.is_dir():
                shutil.rmtree(child, ignore_errors=True)
            else:
                child.unlink()


def _seed_user(email: str = "user@example.com") -> tuple[int, int, int]:
    with TestSessionLocal() as db:
        user = User(email=email, hashed_password=hash_password("secret"))
        db.add(user)
        db.flush()

        shirt = ClothingItem(name="Bluse", category="Oberteil", image_path="1.png", user_id=user.id)
        jeans = ClothingItem(name="Jeans", category="Hose", image_path="2.jpg", user_id=user.id)
        db.add_all([shirt, jeans])
        db.flush()

        outfit = Outfit(name="Casual", user_id=user.id)
        outfit.items = [shirt, jeans]
        db.add(outfit)
        db.commit()

        return user.id, shirt.id, jeans.id


def _auth_headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user_id))}"}


def test_delete_me_removes_user_items_outfits_and_files() -> None:
    user_id, shirt_id, jeans_id = _seed_user()

    user_dir = UPLOAD_DIR / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    (user_dir / "1.png").write_bytes(b"\x89PNG\r\n\x1a\nfake-image")
    (user_dir / "2.jpg").write_bytes(b"fake-jpeg-bytes")
    assert user_dir.exists()

    with TestClient(app) as client:
        response = client.delete("/api/users/me", headers=_auth_headers(user_id))

    assert response.status_code == 204

    with TestSessionLocal() as db:
        assert db.get(User, user_id) is None
        assert db.get(ClothingItem, shirt_id) is None
        assert db.get(ClothingItem, jeans_id) is None
        assert db.scalars(select(Outfit)).all() == []
        assert db.execute(select(outfit_items)).all() == []

    assert not user_dir.exists()


def test_delete_me_works_for_user_without_items() -> None:
    with TestSessionLocal() as db:
        user = User(email="empty@example.com", hashed_password=hash_password("secret"))
        db.add(user)
        db.commit()
        user_id = user.id

    with TestClient(app) as client:
        response = client.delete("/api/users/me", headers=_auth_headers(user_id))

    assert response.status_code == 204

    with TestSessionLocal() as db:
        assert db.get(User, user_id) is None


def test_delete_me_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.delete("/api/users/me")
    assert response.status_code == 401


def test_delete_me_only_removes_the_authenticated_user() -> None:
    first_id, _, _ = _seed_user("first@example.com")
    second_id, second_shirt, _ = _seed_user("second@example.com")

    second_dir = UPLOAD_DIR / str(second_id)
    second_dir.mkdir(parents=True, exist_ok=True)
    (second_dir / "keep.png").write_bytes(b"belongs-to-second-user")

    with TestClient(app) as client:
        response = client.delete("/api/users/me", headers=_auth_headers(first_id))

    assert response.status_code == 204

    with TestSessionLocal() as db:
        assert db.get(User, first_id) is None
        assert db.get(User, second_id) is not None
        assert db.get(ClothingItem, second_shirt) is not None

    assert second_dir.exists()
    assert (second_dir / "keep.png").exists()
