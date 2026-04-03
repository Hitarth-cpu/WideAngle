from __future__ import annotations
from backend.agents.base import Agent
from backend.agents.planner import AgentSpec
from backend.core.ollama import OllamaClient
from backend.tools.document_reader import DocumentReaderTool
from backend.tools.market_calculator import MarketCalculatorTool
from backend.tools.code_search import CodeSearchTool, ReadFileTool
from backend.tools.static_analysis import StaticAnalysisTool

TOOL_REGISTRY = {
    "read_document": lambda ctx: DocumentReaderTool(ctx.get("document_text", "")),
    "calculate_market_size": lambda ctx: MarketCalculatorTool(),
    "search_pattern": lambda ctx: CodeSearchTool(ctx.get("codebase_path", ".")),
    "read_file": lambda ctx: ReadFileTool(ctx.get("codebase_path", ".")),
    "run_linter": lambda ctx: StaticAnalysisTool(ctx.get("codebase_path", ".")),
}


class ConcreteAgent(Agent):
    def __init__(self, spec: AgentSpec, session_id: str, ws_manager, ollama: OllamaClient, tool_context: dict):
        super().__init__(
            name=spec.name, persona=spec.persona, role=spec.role,
            stage=spec.stage, dependencies=spec.dependencies,
            session_id=session_id, ws_manager=ws_manager,
        )
        self._ollama = ollama
        self.tools = [TOOL_REGISTRY[t](tool_context) for t in spec.tools if t in TOOL_REGISTRY]

    def build_system_prompt(self) -> str:
        tool_descriptions = "\n".join(f"  - {t.name}: {t.description}" for t in self.tools)
        tool_section = f"\n\nAvailable tools:\n{tool_descriptions}" if tool_descriptions else ""
        return (
            f"You are {self.name}.\n\nPERSONA: {self.persona}\n\n"
            f"YOUR ROLE: {self.role}\n\n"
            f"INSTRUCTIONS:\n"
            f"- Analyze the input thoroughly from your specific perspective\n"
            f"- Use tools if needed: TOOL: tool_name(key=\"value\")\n"
            f"- Think step by step\n"
            f"- End with: FINAL ANSWER: [your complete analysis]\n"
            f"{tool_section}"
        )

    async def call_llm(self, system: str, messages: list[dict]) -> str:
        user_content = messages[-1]["content"] if messages else ""
        return await self._ollama.complete(system, user_content)

    async def stream_llm(self, system: str, messages: list[dict]) -> str:
        async def on_token(token: str):
            await self.emit_token(token)
        return await self._ollama.stream(system, messages, on_token=on_token)


def build_agent_from_spec(spec: AgentSpec, session_id: str, ws_manager, ollama: OllamaClient, tool_context: dict | None = None) -> ConcreteAgent:
    return ConcreteAgent(spec=spec, session_id=session_id, ws_manager=ws_manager, ollama=ollama, tool_context=tool_context or {})
