from __future__ import annotations
import asyncio
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.agents.base import Agent
    from backend.core.websocket import ConnectionManager

from backend.agents.planner import DAGDefinition, AgentSpec
from backend.orchestrator.dag import resolve_stages, build_context
from backend.orchestrator.queue import AgentQueue

logger = logging.getLogger(__name__)


class SessionRunner:
    """
    Executes a full analysis session:
    1. Resolves DAG stages
    2. Runs all agents within each stage in parallel (controlled by AgentQueue)
    3. Feeds each agent context = original input + dependency agent outputs
    4. Runs Meta Synthesizer with all outputs
    5. Streams WebSocket events throughout
    """

    def __init__(
        self,
        session_id: str,
        ws_manager: "ConnectionManager",
        agent_queue: AgentQueue,
    ):
        self.session_id = session_id
        self.ws_manager = ws_manager
        self.queue = agent_queue

    async def run(
        self,
        dag: DAGDefinition,
        input_text: str,
        agent_factory,  # callable: (AgentSpec, session_id, ws_manager) -> Agent
        meta_agent: "Agent",
    ) -> str:
        """
        Execute the full DAG and return the final synthesized report.

        Args:
            dag: The DAGDefinition from PlannerAgent
            input_text: The normalized text from ingestion
            agent_factory: Callable that instantiates an Agent from an AgentSpec
            meta_agent: The MetaSynthesizer agent instance

        Returns:
            The final report string from the MetaSynthesizer.
        """
        stages = resolve_stages(dag)
        all_outputs: dict[str, str] = {}
        all_agents: dict[str, "Agent"] = {}

        await self._emit("session_start", {
            "session_id": self.session_id,
            "total_stages": len(stages),
            "total_agents": len(dag.agents),
        })

        # Emit plan_ready so the frontend can populate the canvas before agents start
        await self._emit("plan_ready", {
            "agents": [
                {
                    "id": f"{self.session_id}_{spec.name.replace(' ', '_')}",
                    "name": spec.name,
                    "persona": spec.persona,
                    "role": spec.role,
                    "stage": spec.stage,
                    "status": "idle",
                    "output": "",
                    "dependencies": spec.dependencies,
                }
                for spec in dag.agents
            ],
            "dag": {
                "stages": {str(k): [s.name for s in v] for k, v in stages.items()}
            },
        })

        for stage_num in sorted(stages.keys()):
            agent_specs = stages[stage_num]

            await self._emit("stage_start", {
                "stage": stage_num,
                "agents": [s.name for s in agent_specs],
            })

            # Instantiate all agents for this stage
            stage_agents = []
            for spec in agent_specs:
                agent = agent_factory(spec, self.session_id, self.ws_manager)
                agent.session_agents = all_agents  # enable cross-agent queries
                stage_agents.append((spec, agent))
                all_agents[spec.name] = agent

            # Run all agents in this stage concurrently (bounded by semaphore)
            tasks = [
                self.queue.run_agent(
                    agent,
                    build_context(spec, input_text, all_outputs),
                )
                for spec, agent in stage_agents
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for (spec, agent), result in zip(stage_agents, results):
                if isinstance(result, Exception):
                    logger.error(f"Agent '{spec.name}' failed: {result}")
                    all_outputs[spec.name] = f"[Agent failed: {result}]"
                else:
                    all_outputs[spec.name] = result

            await self._emit("stage_done", {"stage": stage_num})

        # Run Meta Synthesizer with all outputs
        await self._emit("meta_start", {"session_id": self.session_id})

        meta_context = self._build_meta_context(input_text, all_outputs)
        final_report = await meta_agent.run(meta_context)

        await self._emit("session_done", {
            "session_id": self.session_id,
            "report": final_report,
        })

        return final_report

    def _build_meta_context(
        self, original_input: str, all_outputs: dict[str, str]
    ) -> str:
        """Build context for the Meta Synthesizer from all agent outputs."""
        parts = [f"=== ORIGINAL INPUT ===\n{original_input[:2000]}"]
        for agent_name, output in all_outputs.items():
            parts.append(f"=== {agent_name.upper()} ===\n{output}")
        return "\n\n".join(parts)

    async def _emit(self, event_type: str, data: dict) -> None:
        await self.ws_manager.send_to_session(self.session_id, {
            "type": event_type,
            "data": data,
        })
