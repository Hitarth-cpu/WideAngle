from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    database_url: str = "mysql+aiomysql://wideangle:password@mysql:3306/wideangle"
    max_concurrent_agents: int = 3
    cors_origins: str = "http://localhost:3000,http://frontend:80"

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
