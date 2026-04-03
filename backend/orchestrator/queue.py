import asyncio
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.agents.base import Agent

from backend.core.config import settings

logger = logging.getLogger(__name__)


class AgentQueue:
    """
    Controls how many agents call Ollama simultaneously.
    Uses an asyncio.Semaphore to limit concurrency to MAX_CONCURRENT_AGENTS.
    Prevents Ollama overload on consumer hardware.
    """

    def __init__(self, max_concurrent: int | None = None):
        self.max_concurrent = max_concurrent or settings.max_concurrent_agents
        self._semaphore = asyncio.Semaphore(self.max_concurrent)

    async def run_agent(self, agent: "Agent", context: str) -> str:
        """
        Run an agent with the semaphore held.
        Blocks until a slot is available if max_concurrent agents are running.
        """
        async with self._semaphore:
            logger.info(
                f"Agent '{agent.name}' acquired queue slot "
                f"(max_concurrent={self.max_concurrent})"
            )
            return await agent.run(context)

    @property
    def available_slots(self) -> int:
        """Number of concurrency slots currently available."""
        return self._semaphore._value  # noqa: SLF001


# Singleton
agent_queue = AgentQueue()
