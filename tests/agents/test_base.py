import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.agents.base import Agent, AgentStatus, MemoryEntry, ToolCall


# Concrete subclass for testing (Agent is ABC)
class ConcreteAgent(Agent):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._llm_responses = iter(["FINAL ANSWER: Test result"])

    def build_system_prompt(self) -> str:
        return f"You are {self.name}. {self.persona}\n\nRole: {self.role}"

    async def call_llm(self, system: str, messages: list[dict]) -> str:
        return next(self._llm_responses, "FINAL ANSWER: done")

    async def stream_llm(self, system: str, messages: list[dict]) -> str:
        response = next(self._llm_responses, "FINAL ANSWER: done")
        await self.emit_token(response)
        return response


def make_agent(**kwargs) -> ConcreteAgent:
    defaults = dict(
        name="Test Agent",
        persona="A test persona",
        role="Test role",
        stage=1,
        dependencies=[],
        session_id="sess-1",
        ws_manager=None,
    )
    defaults.update(kwargs)
    return ConcreteAgent(**defaults)


# ── Status and identity ──────────────────────────────────────────────────

def test_agent_initial_status_is_idle():
    agent = make_agent()
    assert agent.status == AgentStatus.IDLE


def test_agent_has_unique_id():
    a1 = make_agent()
    a2 = make_agent()
    assert a1.id != a2.id


def test_to_dict_has_required_keys():
    agent = make_agent()
    d = agent.to_dict()
    for key in ("id", "name", "persona", "role", "stage", "dependencies", "status", "output"):
        assert key in d


# ── Memory ───────────────────────────────────────────────────────────────

def test_working_memory_starts_empty():
    agent = make_agent()
    assert agent.working_memory == []


def test_long_term_memory_starts_empty():
    agent = make_agent()
    assert agent.long_term_memory == []


# ── Tool call parsing ─────────────────────────────────────────────────────

def test_parse_tool_call_returns_none_when_no_tool():
    agent = make_agent()
    result = agent._parse_tool_call("I am just thinking, no tool needed.")
    assert result is None


def test_parse_tool_call_extracts_name_and_args():
    agent = make_agent()
    thought = 'TOOL: read_file(path="backend/main.py")'
    result = agent._parse_tool_call(thought)
    assert result is not None
    assert result.name == "read_file"
    assert result.args == {"path": "backend/main.py"}


def test_parse_tool_call_no_args():
    agent = make_agent()
    thought = "TOOL: run_analysis()"
    result = agent._parse_tool_call(thought)
    assert result is not None
    assert result.name == "run_analysis"
    assert result.args == {}


# ── Output synthesis ──────────────────────────────────────────────────────

def test_synthesize_output_extracts_final_answer():
    agent = make_agent()
    agent.working_memory = [
        MemoryEntry(role="thought", content="Some initial thinking..."),
        MemoryEntry(role="thought", content="FINAL ANSWER: The market is $4B."),
    ]
    result = agent._synthesize_output()
    assert result == "The market is $4B."


def test_synthesize_output_fallback_joins_thoughts():
    agent = make_agent()
    agent.working_memory = [
        MemoryEntry(role="thought", content="Thought 1"),
        MemoryEntry(role="thought", content="Thought 2"),
    ]
    result = agent._synthesize_output()
    assert "Thought 1" in result
    assert "Thought 2" in result


# ── ReAct run ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_sets_status_to_done():
    agent = make_agent()
    await agent.run("Analyze this startup idea.")
    assert agent.status == AgentStatus.DONE


@pytest.mark.asyncio
async def test_run_produces_output():
    agent = make_agent()
    result = await agent.run("Analyze this startup idea.")
    assert isinstance(result, str)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_run_populates_long_term_memory():
    agent = make_agent()
    await agent.run("Analyze this.")
    assert len(agent.long_term_memory) > 0


@pytest.mark.asyncio
async def test_run_clears_working_memory_on_start():
    agent = make_agent()
    agent.working_memory = [MemoryEntry(role="thought", content="stale")]
    await agent.run("Fresh context")
    # working_memory is rebuilt during run
    assert not any(e.content == "stale" for e in agent.working_memory)


# ── Chat ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_returns_string():
    agent = make_agent()
    agent._llm_responses = iter(["I think the TAM is $4B because..."])
    result = await agent.chat("Why is the TAM so small?")
    assert isinstance(result, str)


@pytest.mark.asyncio
async def test_chat_appends_to_long_term_memory():
    agent = make_agent()
    agent._llm_responses = iter(["Because the market is niche."])
    await agent.chat("Why?")
    assert len(agent.long_term_memory) >= 2


# ── Cross-agent query ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_query_agent_returns_not_found_for_missing():
    agent = make_agent()
    result = await agent.query_agent("NonExistent", "What do you think?")
    assert "not found" in result.lower()


@pytest.mark.asyncio
async def test_query_agent_delegates_to_target():
    agent = make_agent(name="GTM Strategist", stage=2)
    target = make_agent(name="Market Analyst", stage=1)
    target._llm_responses = iter(["TAM is $4B, SAM is $400M"])
    agent.session_agents = {"Market Analyst": target}

    result = await agent.query_agent("Market Analyst", "What is the TAM?")
    assert isinstance(result, str)


# ── Tool argument type coercion ───────────────────────────────────────────

def test_parse_tool_call_handles_unquoted_int():
    agent = make_agent()
    result = agent._parse_tool_call("TOOL: search(limit=10)")
    assert result is not None
    assert result.args["limit"] == 10
    assert isinstance(result.args["limit"], int)


def test_parse_tool_call_handles_unquoted_bool():
    agent = make_agent()
    result = agent._parse_tool_call("TOOL: run_analysis(verbose=true)")
    assert result is not None
    assert result.args["verbose"] is True


def test_parse_tool_call_handles_unquoted_float():
    agent = make_agent()
    result = agent._parse_tool_call("TOOL: score(threshold=0.75)")
    assert result is not None
    assert result.args["threshold"] == 0.75


# ── max_iterations constructor param ──────────────────────────────────────

def test_max_iterations_defaults_to_6():
    agent = make_agent()
    assert agent.max_iterations == 6


def test_max_iterations_can_be_overridden():
    agent = make_agent(max_iterations=12)
    assert agent.max_iterations == 12


# ── WebSocket emission ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_emit_sends_event_to_ws_manager():
    mock_ws = MagicMock()
    mock_ws.send_to_session = AsyncMock()
    agent = make_agent(ws_manager=mock_ws)
    await agent.emit("agent_start", {"agent_id": agent.id, "name": agent.name})
    mock_ws.send_to_session.assert_called_once_with(
        "sess-1",
        {"type": "agent_start", "data": {"agent_id": agent.id, "name": agent.name}},
    )


@pytest.mark.asyncio
async def test_emit_token_sends_token_event():
    mock_ws = MagicMock()
    mock_ws.send_to_session = AsyncMock()
    agent = make_agent(ws_manager=mock_ws)
    await agent.emit_token("hello")
    mock_ws.send_to_session.assert_called_once_with(
        "sess-1",
        {"type": "agent_token", "data": {"agent_id": agent.id, "token": "hello"}},
    )


# ── _act dispatch ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_act_calls_matching_tool():
    class FakeTool:
        name = "read_file"
        description = "Reads a file"
        async def execute(self, **kwargs):
            return f"contents of {kwargs.get('path', '?')}"

    agent = make_agent()
    agent.tools = [FakeTool()]
    result = await agent._act(ToolCall(name="read_file", args={"path": "main.py"}))
    assert "contents of main.py" in result


@pytest.mark.asyncio
async def test_act_returns_error_for_unknown_tool():
    agent = make_agent()
    result = await agent._act(ToolCall(name="nonexistent", args={}))
    assert "Unknown tool" in result


# ── query_agent response content ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_query_agent_response_contains_target_output():
    agent = make_agent(name="GTM Strategist", stage=2)
    target = make_agent(name="Market Analyst", stage=1)
    target._llm_responses = iter(["TAM is $4B, SAM is $400M"])
    agent.session_agents = {"Market Analyst": target}

    result = await agent.query_agent("Market Analyst", "What is the TAM?")
    assert "TAM is $4B" in result
