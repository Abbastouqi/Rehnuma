from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "change-this-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    DATABASE_URL: str = "sqlite+aiosqlite:///./gemma_chat.db"
    MODEL_URL: str = "https://mist.riphah.edu.pk"
    MODEL_NAME: str = "ggml-org/gemma-4-12B-it-GGUF:Q4_K_M"
    MAX_TOKENS: int = 500

    # MongoDB — user profiles, login history, API keys
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "rahnuma"

    # SMTP Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM_NAME: str = "Rahnuma — Riphah International University"

    # App frontend URL (used in email links)
    APP_URL: str = "http://localhost:5173"

    # Refresh tokens
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ChromaDB vector memory
    CHROMA_PATH: str = "./data/chroma"

    # Google OAuth2
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    class Config:
        env_file = ".env"

settings = Settings()
