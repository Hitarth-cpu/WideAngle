import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from backend.orchestrator.queue import AgentQueue


def make_mock_agent(name: str = "Test Agent") -> MagicMock:
    agent = MagicMock()
    agent.name = name
    agent.run = AsyncMock(return_value=f"{name} output")
    return agent


@pytest.mark.asyncio
async def test_run_agent_returns_output():
    queue = AgentQueue(max_concurrent=2)
    agent = make_mock_agent()
    result = await queue.run_agent(agent, "context")
    assert result == "Test Agent output"


@pytest.mark.asyncio
async def test_run_agent_calls_agent_run_with_context():
    queue = AgentQueue(max_concurrent=2)
    agent = make_mock_agent()
    await queue.run_agent(agent, "analyze this startup")
    agent.run.assert_called_once_with("analyze this startup")


@pytest.mark.asyncio
async def test_queue_limits_concurrency():
    """Verify that only max_concurrent agents run simultaneously."""
    max_concurrent = 2
    queue = AgentQueue(max_concurrent=max_concurrent)
    active = []
    peak_active = []

    async def slow_run(context):
        active.append(1)
        peak_active.append(len(active))
        await asyncio.sleep(0.05)
        active.pop()
        return "done"

    agents = [make_mock_agent(f"Agent {i}") for i in range(4)]
    for agent in agents:
        agent.run = slow_run

    await asyncio.gather(*[queue.run_agent(a, "ctx") for a in agents])

    assert max(peak_active) <= max_concurrent


@pytest.mark.asyncio
async def test_available_slots_reflects_semaphore():
    queue = AgentQueue(max_concurrent=3)
    assert queue.available_slots == 3
