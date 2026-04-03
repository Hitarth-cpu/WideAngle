from __future__ import annotations
import json
import logging
import re
from typing import Optional
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)


class AgentSpec(BaseModel):
    """Definition of a single agent in the DAG, output by the Planner."""
    name: str
    persona: str
    role: str
    tools: list[str]
    stage: int
    dependencies: Optional[list[str]]

    @field_validator("stage")
    @classmethod
    def stage_must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("stage must be >= 1")
        return v

    @field_validator("dependencies")
    @classmethod
    def dependencies_must_be_list(cls, v) -> list[str]:
        return v if v is not None else []


class DAGDefinition(BaseModel):
    """Complete agent DAG for a session, output by the Planner."""
    agents: list[AgentSpec]
    mode: str  # "startup" | "code_review"

    def stages(self) -> dict[int, list[AgentSpec]]:
        """Group agents by their stage number."""
        result: dict[int, list[AgentSpec]] = {}
        for agent in self.agents:
            result.setdefault(agent.stage, []).append(agent)
        return result

    def validate_dag(self) -> list[str]:
        """
        Validate the DAG for consistency.
        Returns a list of error strings (empty = valid).
        """
        errors = []
        names = {a.name for a in self.agents}

        for agent in self.agents:
            for dep in agent.dependencies:
                if dep not in names:
                    errors.append(f"Agent '{agent.name}' depends on '{dep}' which doesn't exist")

            # Dependency must be in an earlier stage
            dep_stages = {
                a.stage for a in self.agents if a.name in agent.dependencies
            }
            for dep_stage in dep_stages:
                if dep_stage >= agent.stage:
                    errors.append(
                        f"Agent '{agent.name}' (stage {agent.stage}) depends on an agent "
                        f"in stage {dep_stage} — dependencies must be in earlier stages"
                    )

        return errors


STARTUP_SYSTEM_PROMPT = """You are an expert orchestrator for a startup analysis platform.

Given a startup idea or pitch document, your job is to design a team of specialized analyst agents
that will analyze it from every important angle.

OUTPUT RULES:
1. Output ONLY a valid JSON array — no explanation, no markdown, no code fences
2. Each agent must have: name, persona, role, tools, stage (int >= 1), dependencies (list of agent names)
3. Stage 1 agents have empty dependencies []
4. Stage 2+ agents list Stage 1 agent names they need as dependencies
5. Use only these tool names: read_document, calculate_market_size, compare_competitors
6. Generate 4-8 agents depending on complexity of the input
7. Always include a stage 2 Risk Analyst that depends on all stage 1 agents

Example output format:
[
  {
    "name": "Market Analyst",
    "persona": "A skeptical VC with 15 years experience evaluating market opportunities. Focuses on TAM validity, competitive dynamics, and unit economics.",
    "role": "Analyze market size (TAM/SAM/SOM), identify target customer segments, and validate demand signals.",
    "tools": ["read_document", "calculate_market_size"],
    "stage": 1,
    "dependencies": []
  },
  {
    "name": "Risk Analyst",
    "persona": "A risk officer who has seen hundreds of startups fail. Specializes in identifying what could go wrong.",
    "role": "Synthesize risks across market, technology, and execution dimensions based on all Stage 1 findings.",
    "tools": ["read_document"],
    "stage": 2,
    "dependencies": ["Market Analyst", "Tech Feasibility", "Competitor Scout"]
  }
]"""

CODE_REVIEW_SYSTEM_PROMPT = """You are an expert orchestrator for a code review platform.

Given code or a codebase, your job is to design a team of specialized review agents
that will analyze it from every important angle.

OUTPUT RULES:
1. Output ONLY a valid JSON array — no explanation, no markdown, no code fences
2. Each agent must have: name, persona, role, tools, stage (int >= 1), dependencies (list of agent names)
3. Stage 1 agents have empty dependencies []
4. Stage 2+ agents list Stage 1 agent names they need as dependencies
5. Use only these tool names: read_file, search_pattern, run_linter
6. Generate 4-6 agents depending on complexity of the code
7. Always include a stage 2 Production Readiness agent that depends on all stage 1 agents

Example output format:
[
  {
    "name": "Security Auditor",
    "persona": "An OWASP-certified security engineer with deep experience in finding vulnerabilities.",
    "role": "Identify security vulnerabilities, injection risks, auth weaknesses, and data exposure.",
    "tools": ["read_file", "search_pattern"],
    "stage": 1,
    "dependencies": []
  }
]"""


class PlannerAgent:
    """
    The Planner Agent reads user input and outputs a DAGDefinition
    describing all agents to spawn for this analysis session.

    Unlike other agents, the Planner does not inherit from Agent base class
    because it does not analyze content itself — it only designs the agent team.
    It makes a single LLM call and parses the result.
    """

    def __init__(self, ollama_client):
        """
        Args:
            ollama_client: An OllamaClient instance (injected, not imported here
                           to avoid circular dependencies).
        """
        self.ollama = ollama_client

    async def plan(self, input_text: str, mode: str) -> DAGDefinition:
        """
        Generate a DAGDefinition for the given input.

        Args:
            input_text: The normalized text from ingestion (startup doc or code).
            mode: "startup" or "code_review"

        Returns:
            A validated DAGDefinition.

        Raises:
            ValueError: If the LLM response cannot be parsed or the DAG is invalid.
        """
        system = STARTUP_SYSTEM_PROMPT if mode == "startup" else CODE_REVIEW_SYSTEM_PROMPT

        user_prompt = (
            f"Design the agent team for the following input:\n\n"
            f"---\n{input_text[:4000]}\n---\n\n"  # truncate to avoid token overflow
            f"Output only the JSON array."
        )

        raw_response = await self.ollama.complete(system, user_prompt)
        agents = self._parse_response(raw_response)
        dag = DAGDefinition(agents=agents, mode=mode)

        errors = dag.validate_dag()
        if errors:
            logger.warning(f"Planner produced invalid DAG: {errors}. Attempting repair.")
            dag = self._repair_dag(dag, errors)

        return dag

    def _parse_response(self, raw: str) -> list[AgentSpec]:
        """
        Parse the LLM's JSON response into a list of AgentSpec objects.
        Handles common LLM formatting issues (markdown fences, leading text).
        """
        # Strip markdown code fences if present
        cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip()
        cleaned = re.sub(r"```\s*$", "", cleaned).strip()

        # Extract JSON array (find first [ ... ] block)
        match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"Planner response contains no JSON array: {raw[:200]}")

        try:
            data = json.loads(match.group())
        except json.JSONDecodeError as e:
            raise ValueError(f"Planner response is invalid JSON: {e}") from e

        return [AgentSpec(**item) for item in data]

    def _repair_dag(self, dag: DAGDefinition, errors: list[str]) -> DAGDefinition:
        """
        Attempt to auto-repair common DAG validation errors:
        - Remove dependencies that reference non-existent agents
        - Agents with forward-stage dependencies get their dependencies cleared
        """
        names = {a.name for a in dag.agents}
        repaired = []
        for agent in dag.agents:
            # Remove non-existent dependencies
            valid_deps = [d for d in agent.dependencies if d in names]
            # Remove dependencies that are in same or later stage
            same_or_later = {
                a.name for a in dag.agents
                if a.name in valid_deps and a.stage >= agent.stage
            }
            valid_deps = [d for d in valid_deps if d not in same_or_later]
            repaired.append(agent.model_copy(update={"dependencies": valid_deps}))

        return DAGDefinition(agents=repaired, mode=dag.mode)
