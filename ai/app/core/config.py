from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Anook AI Service"

    # Gemini Configuration
    GEMINI_API_KEY: str

    # Database Configuration
    POSTGRES_USER: str = "anook_user"
    POSTGRES_PASSWORD: str = "anook2026"
    POSTGRES_DB: str = "anook_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: str = "5432"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = (".env", "../.env")
        case_sensitive = True
        extra = "ignore"

settings = Settings()
