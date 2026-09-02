"""Authentication endpoints (stubs — filled by the auth ticket)."""

from fastapi import APIRouter, HTTPException

from app.schemas import Token, UserCreate, UserLogin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(payload: UserCreate) -> Token:
    raise HTTPException(status_code=501, detail="auth ticket implements register")


@router.post("/login", response_model=Token)
def login(payload: UserLogin) -> Token:
    raise HTTPException(status_code=501, detail="auth ticket implements login")
