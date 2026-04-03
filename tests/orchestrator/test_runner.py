import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.agents.planner import DAGDefinition, AgentSpec
from backend.orchestrator.runner import SessionRunner
from backend.orchestrator.queue import AgentQueue


def make_spec(name: str, stage: int, deps: list[str] = None) -> AgentSpec:
    return AgentSpec(
        name=name, persona="p", role="r", tools=[],
        stage=stage, dependencies=deps or [],
    )


def make_ws_manager() -> MagicMock:
    ws = MagicMock()
    ws.send_to_session = AsyncMock()
    return ws


def make_agent_factory(outputs: dict[str, str]):
    """Factory that returns mock agents with preset outputs."""
    def factory(spec: AgentSpec, session_id: str, ws_manager) -> MagicMock:
        agent = MagicMock()
        agent.name = spec.name
        agent.session_agents = {}
        agent.run = AsyncMock(return_value=outputs.get(spec.name, f"{spec.name} output"))
        return agent
    return factory


@pytest.mark.asyncio
async def test_runner_runs_all_stages():
    dag = DAGDefinition(agents=[
        make_spec("Agent A", 1),
        make_spec("Agent B", 2, ["Agent A"]),
    ], mode="startup")

    ws = make_ws_manager()
    queue = AgentQueue(max_concurrent=3)
    runner = SessionRunner("sess-1", ws, queue)

    meta = MagicMock()
    meta.run = AsyncMock(return_value="Final report here")
    meta.session_agents = {}

    factory = make_agent_factory({"Agent A": "A result", "Agent B": "B result"})
    result = await runner.run(dag, "input text", factory, meta)

    assert result == "Final report here"


@pytest.mark.asyncio
async def test_runner_emits_stage_events():
    dag = DAGDefinition(agents=[make_spec("Agent A", 1)], mode="startup")
    ws = make_ws_manager()
    queue = AgentQueue(max_concurrent=3)
    runner = SessionRunner("sess-1", ws, queue)

    meta = MagicMock()
    meta.run = AsyncMock(return_value="report")
    meta.session_agents = {}

    factory = make_agent_factory({"Agent A": "output"})
    await runner.run(dag, "input", factory, meta)

    # Check that send_to_session was called with stage events
    calls = [str(call) for call in ws.send_to_session.call_args_list]
    assert any("stage_start" in c for c in calls)
    assert any("stage_done" in c for c in calls)


@pytest.mark.asyncio
async def test_runner_handles_agent_failure_gracefully():
    dag = DAGDefinition(agents=[make_spec("Failing Agent", 1)], mode="startup")
    ws = make_ws_manager()
    queue = AgentQueue(max_concurrent=3)
    runner = SessionRunner("sess-1", ws, queue)

    meta = MagicMock()
    meta.run = AsyncMock(return_value="report despite failure")
    meta.session_agents = {}

    def failing_factory(spec, session_id, ws_manager):
        agent = MagicMock()
        agent.name = spec.name
        agent.session_agents = {}
        agent.run = AsyncMock(side_effect=RuntimeError("LLM crashed"))
        return agent

    # Should not raise — failure is captured gracefully
    result = await runner.run(dag, "input", failing_factory, meta)
    assert result == "report despite failure"


@pytest.mark.asyncio
async def test_runner_passes_dependency_context():
    """Stage 2 agent should receive Stage 1 output in its context."""
    dag = DAGDefinition(agents=[
        make_spec("Stage1", 1),
        make_spec("Stage2", 2, ["Stage1"]),
    ], mode="startup")

    ws = make_ws_manager()
    queue = AgentQueue(max_concurrent=3)
    runner = SessionRunner("sess-1", ws, queue)

    received_contexts = {}

    def capturing_factory(spec, session_id, ws_manager):
        agent = MagicMock()
        agent.name = spec.name
        agent.session_agents = {}
        async def run(context):
            received_contexts[spec.name] = context
            return f"{spec.name} output"
        agent.run = run
        return agent

    meta = MagicMock()
    meta.run = AsyncMock(return_value="final")
    meta.session_agents = {}

    await runner.run(dag, "original input", capturing_factory, meta)

    assert "original input" in received_contexts["Stage1"]
    assert "Stage1 output" in received_contexts["Stage2"]
