from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    database_url: str = "sqlite+aiosqlite:///./wideangle.db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
