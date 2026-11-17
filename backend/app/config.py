"""Settings, read from environment variables or a `.env` file in backend/."""
from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Same variable names the original AI Studio app used.
    gemini_api_key: str | None = Field(
        default=None, validation_alias=AliasChoices("GEMINI_API_KEY", "API_KEY")
    )

    # Model IDs are copied from the original server.ts. Override them in .env
    # (GEMINI_MODEL_TEXT / GEMINI_MODEL_IMAGE) if Google renames or retires them.
    gemini_model_text: str = "gemini-3.8-flash"
    gemini_model_image: str = "gemini-3.1-flash-lite-image"

    # Persona portraits: how many images may be generated at the same time.
    image_concurrency: int = 3

    # Abuse protection (the original server had none).
    rate_limit_per_minute: int = 30  # per client IP, 0 disables
    max_body_bytes: int = 60 * 1024 * 1024  # same 60 MB cap as the Express app

    # Where the built React app lives (served by FastAPI in production).
    frontend_dist: Path = REPO_DIR / "frontend" / "dist"

    # Only needed if you serve the UI from a different origin than the API.
    cors_origins: list[str] = []


@lru_cache
def get_settings() -> Settings:
    return Settings()
