import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.agents.planner import AgentSpec
from backend.agents.concrete import build_agent_from_spec, ConcreteAgent


def make_spec(tools=None):
    return AgentSpec(name="Market Analyst", persona="A skeptical VC",
                     role="Analyze market", tools=tools or ["read_document"], stage=1, dependencies=[])


def make_ollama():
    m = MagicMock()
    m.complete = AsyncMock(return_value="FINAL ANSWER: Large market.")
    m.stream = AsyncMock(return_value="FINAL ANSWER: Large market.")
    return m


def test_builds_concrete_agent():
    agent = build_agent_from_spec(make_spec(), "s1", None, make_ollama())
    assert isinstance(agent, ConcreteAgent)
    assert agent.name == "Market Analyst"


def test_agent_has_correct_tools():
    agent = build_agent_from_spec(make_spec(["read_document", "calculate_market_size"]), "s1", None, make_ollama())
    assert any(t.name == "read_document" for t in agent.tools)
    assert any(t.name == "calculate_market_size" for t in agent.tools)


def test_agent_skips_unknown_tools():
    agent = build_agent_from_spec(make_spec(["read_document", "nonexistent"]), "s1", None, make_ollama())
    assert len(agent.tools) == 1


def test_system_prompt_contains_persona():
    agent = build_agent_from_spec(make_spec(), "s1", None, make_ollama())
    assert "skeptical VC" in agent.build_system_prompt()
    assert "FINAL ANSWER:" in agent.build_system_prompt()


@pytest.mark.asyncio
async def test_run_returns_string():
    agent = build_agent_from_spec(make_spec(), "s1", None, make_ollama())
    result = await agent.run("Analyze this startup idea")
    assert isinstance(result, str) and len(result) > 0
