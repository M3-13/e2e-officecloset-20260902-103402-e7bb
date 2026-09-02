"""User endpoints (stubs — filled by the account-deletion ticket)."""

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/api/users", tags=["users"])


@router.delete("/me", status_code=204)
def delete_me(current_user: User = Depends(get_current_user)) -> None:
    raise HTTPException(status_code=501, detail="users ticket implements delete_me")
