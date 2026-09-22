from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemma-4-26b-a4b-it" # Fallback if not provided

    class Config:
        env_file = ".env"

settings = Settings()
