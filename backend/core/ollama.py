import asyncio
import httpx
import json
import logging
from backend.core.config import settings

logger = logging.getLogger(__name__)

OLLAMA_CHAT_ENDPOINT = "/api/chat"
OLLAMA_TAGS_ENDPOINT = "/api/tags"


class OllamaClient:
    """
    Async HTTP client for the local Ollama inference API.
    Used by all agents for LLM calls.
    """

    def __init__(self, base_url: str | None = None, model: str | None = None):
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.model = model or settings.ollama_model

    async def complete(self, system: str, user: str) -> str:
        """
        Single non-streaming completion. Returns the full response string.
        Used by PlannerAgent and for chat() calls.
        """
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=600.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}{OLLAMA_CHAT_ENDPOINT}",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data["message"]["content"]
            except httpx.HTTPStatusError as e:
                logger.error(f"Ollama HTTP error: {e.response.status_code} {e.response.text}")
                raise
            except httpx.ConnectError:
                raise ConnectionError(
                    f"Cannot connect to Ollama at {self.base_url}. "
                    "Is Ollama running? Run: ollama serve"
                )

    async def stream(
        self,
        system: str,
        messages: list[dict],
        on_token: callable,
    ) -> str:
        """
        Streaming completion. Calls on_token(token: str) for each chunk.
        Returns the full assembled response.

        Args:
            system: System prompt string
            messages: List of {"role": ..., "content": ...} dicts
            on_token: Async callable invoked per token chunk
        """
        all_messages = [{"role": "system", "content": system}] + messages
        payload = {
            "model": self.model,
            "messages": all_messages,
            "stream": True,
        }

        full_response = []
        async with httpx.AsyncClient(timeout=600.0) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}{OLLAMA_CHAT_ENDPOINT}",
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        token = chunk.get("message", {}).get("content", "")
                        if token:
                            full_response.append(token)
                            result = on_token(token)
                            if asyncio.iscoroutine(result):
                                await result

                        if chunk.get("done", False):
                            break
            except httpx.ConnectError:
                raise ConnectionError(
                    f"Cannot connect to Ollama at {self.base_url}. "
                    "Is Ollama running? Run: ollama serve"
                )

        return "".join(full_response)

    async def is_available(self) -> bool:
        """Check if Ollama is reachable and the configured model is available."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.get(f"{self.base_url}{OLLAMA_TAGS_ENDPOINT}")
                if response.status_code != 200:
                    return False
                models = response.json().get("models", [])
                return any(m.get("name", "").startswith(self.model) for m in models)
            except (httpx.ConnectError, httpx.TimeoutException):
                return False


# Singleton — injected into agents by the orchestrator
ollama_client = OllamaClient()
