"""Settings, read from environment variables or a `.env` file in backend/."""
from functools import lru_cache
from pathlib import Path
from typing import Literal

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

    # Temporary Google-side failures (503 "high demand", 500, 504) are retried
    # with exponential backoff: waits base, 2*base, ... between attempts.
    gemini_max_attempts: int = 3
    gemini_retry_base_delay: float = 2.0

    # Step 2 (market intelligence) uses Google Search grounding, which has its
    # own quota and may be unavailable on some plans.
    #   auto: try search; if quota is exhausted, fall back to no-search with a
    #         visible warning in the report (default)
    #   on:   always use search; show the error if it fails
    #   off:  never use search
    search_grounding: Literal["auto", "on", "off"] = "auto"

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
