"""App configuration — loaded from environment variables"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # PostgreSQL
    OPENCLAW_PG_URL: str = Field(
        default="postgresql+asyncpg://app_openclaw:@192.168.111.6:35432/db_openclaw_memory"
    )

    # Security
    FERNET_KEY: str = Field(default="")

    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000"

    # AI (OpenClaw gateway)
    OPENCLAW_API_BASE: str = "http://localhost:3000"
    OPENCLAW_API_KEY: str = ""

    # e-Office defaults (can be overridden via Settings UI + DB)
    EOFFICE_BASE_URL: str = "https://eoffice.ntplc.co.th"
    EOFFICE_BUCKET_ID: int = 390

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def async_pg_url(self) -> str:
        url = self.OPENCLAW_PG_URL
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def sync_pg_url(self) -> str:
        url = self.OPENCLAW_PG_URL
        return url.replace("postgresql+asyncpg://", "postgresql://").replace(
            "postgresql://", "postgresql+psycopg2://", 1
        ) if "+asyncpg" in url else url


settings = Settings()
