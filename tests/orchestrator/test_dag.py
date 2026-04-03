import pytest
from backend.agents.planner import DAGDefinition, AgentSpec
from backend.orchestrator.dag import resolve_stages, build_context


def make_spec(name: str, stage: int, dependencies: list[str] = None) -> AgentSpec:
    return AgentSpec(
        name=name,
        persona="test persona",
        role="test role",
        tools=[],
        stage=stage,
        dependencies=dependencies or [],
    )


def test_resolve_stages_groups_correctly():
    agents = [
        make_spec("A", 1),
        make_spec("B", 1),
        make_spec("C", 2, ["A", "B"]),
    ]
    dag = DAGDefinition(agents=agents, mode="startup")
    stages = resolve_stages(dag)

    assert 1 in stages
    assert 2 in stages
    assert len(stages[1]) == 2
    assert len(stages[2]) == 1


def test_resolve_stages_sorted():
    agents = [
        make_spec("Z", 3),
        make_spec("A", 1),
        make_spec("B", 2),
    ]
    dag = DAGDefinition(agents=agents, mode="startup")
    stages = resolve_stages(dag)
    assert sorted(stages.keys()) == [1, 2, 3]


def test_build_context_includes_input():
    spec = make_spec("Market Analyst", 1)
    context = build_context(spec, "Startup idea here", {})
    assert "Startup idea here" in context


def test_build_context_includes_dependency_outputs():
    spec = make_spec("GTM Strategist", 2, ["Market Analyst"])
    context = build_context(
        spec,
        "original input",
        {"Market Analyst": "TAM is $4B"},
    )
    assert "TAM is $4B" in context
    assert "original input" in context


def test_build_context_skips_missing_dependencies():
    spec = make_spec("Risk Analyst", 2, ["Ghost Agent"])
    context = build_context(spec, "input", {})
    assert "input" in context
    # No crash even if dependency output is missing
