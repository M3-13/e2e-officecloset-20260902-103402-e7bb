"""User endpoints: self-service account deletion with full data cleanup."""

import os
import shutil

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_current_user, get_db
from app.models import User

router = APIRouter(prefix="/api/users", tags=["users"])


@router.delete("/me", status_code=204)
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete the authenticated user and every piece of their data.

    Clothing items and outfits are removed through the ORM cascade configured
    on ``User`` (``cascade="all, delete-orphan"``), which also clears the
    ``outfit_items`` association rows. After the transaction commits, the
    user's upload directory is removed recursively from the filesystem.
    """
    user_id = current_user.id
    upload_dir = os.path.join(settings.upload_dir, str(user_id))

    db.delete(current_user)
    db.commit()

    shutil.rmtree(upload_dir, ignore_errors=True)
