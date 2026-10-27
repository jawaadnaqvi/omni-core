from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional # 👈 Yeh import add karein

class Settings(BaseSettings):
    PROJECT_NAME: str = "Omni Core"
    DATABASE_URL: str
    SECRET_KEY: str
    API_V1_STR: str = "/api/v1"

    # 👇 Yeh do lines add karein
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()