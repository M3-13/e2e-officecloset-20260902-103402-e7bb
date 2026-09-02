"""Application configuration, read lazily from the environment.

Every value is read on access (never at import time) so the process can boot
and serve the health endpoint even before a secret is present, and it is
validated once at startup by :meth:`Settings.validate`.
"""

import os


class Settings:
    @property
    def database_url(self) -> str:
        return os.environ.get("DATABASE_URL", "sqlite:///./dev.db")

    @property
    def jwt_secret_key(self) -> str:
        secret = os.environ.get("JWT_SECRET_KEY")
        if not secret:
            raise RuntimeError(
                "JWT_SECRET_KEY is not set. Declare it in RUN.json as a 'generate' "
                "secret; it is rolled per run and never stored in the repository."
            )
        return secret

    @property
    def access_token_expire_minutes(self) -> int:
        return int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))

    @property
    def frontend_origin(self) -> str:
        return os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

    @property
    def upload_dir(self) -> str:
        return os.environ.get("UPLOAD_DIR", "./uploads")

    @property
    def max_upload_mb(self) -> int:
        return int(os.environ.get("MAX_UPLOAD_MB", "5"))

    def validate(self) -> None:
        """Touch every setting once so a missing required value fails startup."""
        _ = self.jwt_secret_key
        _ = self.database_url
        _ = self.access_token_expire_minutes
        _ = self.frontend_origin
        _ = self.upload_dir
        _ = self.max_upload_mb


settings = Settings()
