import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.agents.planner import PlannerAgent, DAGDefinition, AgentSpec


VALID_STARTUP_RESPONSE = '''[
  {
    "name": "Market Analyst",
    "persona": "A skeptical VC.",
    "role": "Analyze market size.",
    "tools": ["read_document", "calculate_market_size"],
    "stage": 1,
    "dependencies": []
  },
  {
    "name": "Tech Feasibility",
    "persona": "A CTO.",
    "role": "Evaluate technical complexity.",
    "tools": ["read_document"],
    "stage": 1,
    "dependencies": []
  },
  {
    "name": "Risk Analyst",
    "persona": "A risk officer.",
    "role": "Identify all risks.",
    "tools": ["read_document"],
    "stage": 2,
    "dependencies": ["Market Analyst", "Tech Feasibility"]
  }
]'''

VALID_CODE_RESPONSE = '''[
  {
    "name": "Security Auditor",
    "persona": "OWASP expert.",
    "role": "Find vulnerabilities.",
    "tools": ["read_file", "search_pattern"],
    "stage": 1,
    "dependencies": []
  },
  {
    "name": "Production Readiness",
    "persona": "DevOps engineer.",
    "role": "Check prod readiness.",
    "tools": ["read_file"],
    "stage": 2,
    "dependencies": ["Security Auditor"]
  }
]'''

FENCED_RESPONSE = '''```json
[
  {
    "name": "Market Analyst",
    "persona": "A skeptical VC.",
    "role": "Analyze market.",
    "tools": ["read_document"],
    "stage": 1,
    "dependencies": []
  }
]
```'''


def make_planner(response: str) -> PlannerAgent:
    mock_ollama = MagicMock()
    mock_ollama.complete = AsyncMock(return_value=response)
    return PlannerAgent(ollama_client=mock_ollama)


# ── Parsing ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_plan_returns_dag_definition():
    planner = make_planner(VALID_STARTUP_RESPONSE)
    dag = await planner.plan("A SaaS for project management", "startup")
    assert isinstance(dag, DAGDefinition)
    assert dag.mode == "startup"


@pytest.mark.asyncio
async def test_plan_parses_agents():
    planner = make_planner(VALID_STARTUP_RESPONSE)
    dag = await planner.plan("input", "startup")
    assert len(dag.agents) == 3
    names = [a.name for a in dag.agents]
    assert "Market Analyst" in names
    assert "Risk Analyst" in names


@pytest.mark.asyncio
async def test_plan_handles_markdown_fenced_response():
    planner = make_planner(FENCED_RESPONSE)
    dag = await planner.plan("input", "startup")
    assert len(dag.agents) == 1
    assert dag.agents[0].name == "Market Analyst"


@pytest.mark.asyncio
async def test_plan_raises_on_no_json():
    planner = make_planner("Sorry, I cannot help with that.")
    with pytest.raises(ValueError, match="no JSON array"):
        await planner.plan("input", "startup")


@pytest.mark.asyncio
async def test_plan_raises_on_invalid_json():
    planner = make_planner("[{invalid json}]")
    with pytest.raises(ValueError, match="invalid JSON"):
        await planner.plan("input", "startup")


# ── DAGDefinition ─────────────────────────────────────────────────────────

def test_dag_stages_groups_by_stage():
    agents = [
        AgentSpec(name="A", persona="p", role="r", tools=[], stage=1, dependencies=[]),
        AgentSpec(name="B", persona="p", role="r", tools=[], stage=1, dependencies=[]),
        AgentSpec(name="C", persona="p", role="r", tools=[], stage=2, dependencies=["A"]),
    ]
    dag = DAGDefinition(agents=agents, mode="startup")
    stages = dag.stages()
    assert len(stages[1]) == 2
    assert len(stages[2]) == 1


def test_dag_validate_detects_missing_dependency():
    agents = [
        AgentSpec(name="A", persona="p", role="r", tools=[], stage=2, dependencies=["NonExistent"]),
    ]
    dag = DAGDefinition(agents=agents, mode="startup")
    errors = dag.validate_dag()
    assert any("NonExistent" in e for e in errors)


def test_dag_validate_detects_same_stage_dependency():
    agents = [
        AgentSpec(name="A", persona="p", role="r", tools=[], stage=1, dependencies=[]),
        AgentSpec(name="B", persona="p", role="r", tools=[], stage=1, dependencies=["A"]),
    ]
    dag = DAGDefinition(agents=agents, mode="startup")
    errors = dag.validate_dag()
    assert any("stage 1" in e for e in errors)


def test_dag_validate_passes_valid_dag():
    agents = [
        AgentSpec(name="A", persona="p", role="r", tools=[], stage=1, dependencies=[]),
        AgentSpec(name="B", persona="p", role="r", tools=[], stage=2, dependencies=["A"]),
    ]
    dag = DAGDefinition(agents=agents, mode="startup")
    errors = dag.validate_dag()
    assert errors == []


# ── Auto-repair ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_plan_repairs_missing_dependencies():
    bad_response = '''[
      {
        "name": "Market Analyst",
        "persona": "VC",
        "role": "analyze",
        "tools": [],
        "stage": 2,
        "dependencies": ["Ghost Agent"]
      }
    ]'''
    planner = make_planner(bad_response)
    # Should not raise — repairs instead
    dag = await planner.plan("input", "startup")
    assert dag.agents[0].dependencies == []


# ── AgentSpec validation ──────────────────────────────────────────────────

def test_agent_spec_stage_must_be_positive():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        AgentSpec(name="A", persona="p", role="r", tools=[], stage=0, dependencies=[])


def test_agent_spec_none_dependencies_becomes_empty_list():
    spec = AgentSpec(name="A", persona="p", role="r", tools=[], stage=1, dependencies=None)
    assert spec.dependencies == []


# ── Code review mode ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_plan_code_review_mode():
    planner = make_planner(VALID_CODE_RESPONSE)
    dag = await planner.plan("def foo(): pass", "code_review")
    assert dag.mode == "code_review"
    assert len(dag.agents) == 2
