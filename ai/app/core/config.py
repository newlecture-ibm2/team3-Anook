from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Anook AI Service"

    # Gemini Configuration
    GEMINI_API_KEY: str
    GEMINI_MODEL_NAME: str = "gemini-2.5-flash"
    GEMINI_AB_MODEL: str = ""
    # Thinking 예산: -1=동적(모델이 판단), 0=완전 끔, N=상한 토큰 수
    GEMINI_THINKING_BUDGET: int = -1

    # Database Configuration
    POSTGRES_USER: str = "anook_user"
    POSTGRES_PASSWORD: str = "anook2026"
    POSTGRES_DB: str = "anook_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Neo4j Configuration
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "anook2026"

    class Config:
        env_file = ("../.env", ".env")
        case_sensitive = True
        extra = "ignore"

settings = Settings()
