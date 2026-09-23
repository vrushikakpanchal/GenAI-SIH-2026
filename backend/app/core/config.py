import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    PROJECT_NAME: str = "SENTINEL Cybersecurity Content Intelligence"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "sentinel-super-secret-key-change-in-production-2026-sih"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # SQLite default, or PostgreSQL if configured
    DATABASE_URL: str = f"sqlite:///{DATA_DIR.as_posix()}/sentinel.db"
    
    # Remote Ollama running on Kaggle via ngrok
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:14b"
    OLLAMA_TIMEOUT_SECONDS: float = 90.0
    # Ngrok/Kaggle tunnels can briefly reject a connection while the upstream
    # runtime is cold-starting. Retries apply only to transient transport and
    # gateway failures; a failed generation still creates no output.
    OLLAMA_MAX_RETRIES: int = 2

    # Max upload file size (50 MB)
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env", ".env"),
        extra="ignore"
    )

settings = Settings()
