"""Authentication endpoints: register, login and per-IP rate limiting."""

import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import User
from app.schemas import Token, UserCreate, UserLogin
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

RATE_LIMIT = 5
RATE_LIMIT_WINDOW_SECONDS = 60
MIN_PASSWORD_LENGTH = 8


class InMemoryRateLimiter:
    """Sliding-window rate limiter keyed by client identifier (IP)."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        recent = [t for t in self._attempts[key] if now - t < self.window_seconds]
        if len(recent) >= self.limit:
            self._attempts[key] = recent
            return False
        recent.append(now)
        self._attempts[key] = recent
        return True

    def reset(self) -> None:
        self._attempts.clear()


rate_limiter = InMemoryRateLimiter(limit=RATE_LIMIT, window_seconds=RATE_LIMIT_WINDOW_SECONDS)


def _client_ip(request: Request) -> str:
    if request.client is not None:
        return request.client.host
    return "unknown"


def _enforce_rate_limit(request: Request) -> None:
    if not rate_limiter.allow(_client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail="Zu viele Versuche. Bitte warten Sie eine Minute und versuchen Sie es erneut.",
        )


@router.post("/register", response_model=Token)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)) -> Token:
    _enforce_rate_limit(request)

    if len(payload.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="Passwort muss mindestens 8 Zeichen lang sein.",
        )

    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first() is not None:
        raise HTTPException(status_code=409, detail="E-Mail ist bereits registriert.")

    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return Token(access_token=create_access_token(str(user.id)), token_type="bearer")


@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)) -> Token:
    _enforce_rate_limit(request)

    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort ist falsch.")

    return Token(access_token=create_access_token(str(user.id)), token_type="bearer")
