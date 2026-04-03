from __future__ import annotations
import logging
from backend.agents.planner import DAGDefinition, AgentSpec

logger = logging.getLogger(__name__)


def resolve_stages(dag: DAGDefinition) -> dict[int, list[AgentSpec]]:
    """
    Group agents by stage, sorted by stage number.
    Returns {stage_num: [AgentSpec, ...]} ordered from lowest to highest stage.
    """
    return dag.stages()


def build_context(
    agent_spec: AgentSpec,
    original_input: str,
    all_outputs: dict[str, str],
) -> str:
    """
    Build the context string for an agent.
    Combines the original user input with outputs from dependency agents.
    """
    parts = [f"=== USER INPUT ===\n{original_input}"]

    for dep_name in agent_spec.dependencies:
        dep_output = all_outputs.get(dep_name)
        if dep_output:
            parts.append(f"=== {dep_name.upper()} ANALYSIS ===\n{dep_output}")

    return "\n\n".join(parts)
