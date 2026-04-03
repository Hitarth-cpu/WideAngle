from __future__ import annotations
import re
import uuid
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:
    from backend.core.websocket import ConnectionManager

logger = logging.getLogger(__name__)


@runtime_checkable
class Tool(Protocol):
    """Protocol that all agent tools must implement."""
    name: str
    description: str  # shown to agent in system prompt so it knows what tools exist

    async def execute(self, **kwargs) -> str:
        """Execute the tool and return a string observation."""
        ...


class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    ACTING = "acting"
    DONE = "done"


@dataclass
class ToolCall:
    """Represents a tool invocation parsed from agent thought."""
    name: str
    args: dict[str, Any]


@dataclass
class MemoryEntry:
    """A single item in working or long-term memory."""
    role: str   # "thought" | "observation" | "output"
    content: str


class Agent(ABC):
    """
    Base class for all WideAngle agents.

    Each agent is a living Python object with:
    - Its own persona, role, and stage in the DAG
    - Working memory (RAM only, cleared each run)
    - Long-term memory (persisted, used for post-run chat)
    - A ReAct loop: think → act (tool) → observe → reflect → repeat
    - Streaming token output via WebSocket
    - Interactive chat capability after run completes
    """

    def __init__(
        self,
        name: str,
        persona: str,
        role: str,
        stage: int,
        dependencies: list[str],
        session_id: str,
        ws_manager: "ConnectionManager | None" = None,
        max_iterations: int = 6,
    ):
        self.id = str(uuid.uuid4())
        self.name = name
        self.persona = persona
        self.role = role
        self.stage = stage
        self.dependencies = dependencies  # names of agents whose output this agent needs
        self.session_id = session_id
        self.ws_manager = ws_manager
        self.max_iterations = max_iterations

        # Memory layers
        self.working_memory: list[MemoryEntry] = []      # cleared each run
        self.long_term_memory: list[MemoryEntry] = []    # persisted across chat
        self.context_window: str = ""                    # input + dependency outputs

        # State
        self.status: AgentStatus = AgentStatus.IDLE
        self.output: str = ""
        self.beliefs: dict[str, Any] = {}

        # Tools available to this agent (populated by subclasses)
        self.tools: list[Tool] = []

        # Other agents in the session (for cross-agent queries)
        self.session_agents: dict[str, "Agent"] = {}

    # ── Abstract interface ────────────────────────────────────────────────

    @abstractmethod
    def build_system_prompt(self) -> str:
        """Build the system prompt from persona + role + available tools."""
        ...

    @abstractmethod
    async def call_llm(self, system: str, messages: list[dict]) -> str:
        """Call the LLM and return the response. Subclasses inject Ollama client."""
        ...

    @abstractmethod
    async def stream_llm(self, system: str, messages: list[dict]) -> str:
        """Stream LLM response token-by-token. Emits WS events per token."""
        ...

    # ── Core execution ────────────────────────────────────────────────────

    async def run(self, context: str) -> str:
        """
        Main entry point. Run the ReAct loop and return final output.
        Streams tokens to the WebSocket as they arrive.
        """
        self.working_memory = []
        self.context_window = context
        self.status = AgentStatus.THINKING

        await self.emit("agent_start", {
            "agent_id": self.id,
            "name": self.name,
            "stage": self.stage,
        })

        max_iterations = self.max_iterations
        for iteration in range(max_iterations):
            thought = await self._think()
            self.working_memory.append(MemoryEntry(role="thought", content=thought))

            tool_call = self._parse_tool_call(thought)
            if tool_call:
                self.status = AgentStatus.ACTING
                await self.emit("agent_status", {"agent_id": self.id, "status": "acting"})

                observation = await self._act(tool_call)
                self.working_memory.append(MemoryEntry(role="observation", content=observation))

                self.status = AgentStatus.THINKING
                await self.emit("agent_status", {"agent_id": self.id, "status": "thinking"})
                # After acting, let the agent re-read observation before deciding to finish
                continue

            # Only check finish when no tool was dispatched this iteration
            if await self._should_finish(thought):
                break

        self.output = self._synthesize_output()
        self.long_term_memory.extend(self.working_memory)
        self.long_term_memory.append(MemoryEntry(role="output", content=self.output))

        self.status = AgentStatus.DONE
        await self.emit("agent_done", {
            "agent_id": self.id,
            "name": self.name,
            "output": self.output,
        })

        return self.output

    async def chat(self, user_message: str) -> str:
        """
        Interactive dialogue after the run. Agent responds in-character
        using its long_term_memory as context.
        """
        messages = self._build_chat_messages(user_message)
        response = await self.call_llm(self.build_system_prompt(), messages)
        self.long_term_memory.append(MemoryEntry(role="thought", content=f"User: {user_message}"))
        self.long_term_memory.append(MemoryEntry(role="thought", content=f"Agent: {response}"))
        return response

    async def query_agent(self, agent_name: str, question: str) -> str:
        """
        Cross-agent query: ask another agent in this session a question.
        Used by Stage 2 agents to get deeper context from Stage 1 agents.
        """
        target = self.session_agents.get(agent_name)
        if target is None:
            return f"[Agent '{agent_name}' not found in this session]"
        return await target.chat(question)

    # ── ReAct loop helpers ────────────────────────────────────────────────

    async def _think(self) -> str:
        """Single LLM reasoning step. Streams tokens to WebSocket."""
        messages = self._build_react_messages()
        thought = await self.stream_llm(self.build_system_prompt(), messages)
        return thought

    async def _act(self, tool_call: ToolCall) -> str:
        """Execute a tool and return the observation."""
        for tool in self.tools:
            if tool.name == tool_call.name:
                try:
                    result = await tool.execute(**tool_call.args)
                    return result
                except Exception as e:
                    logger.error(f"Tool {tool_call.name} failed: {e}")
                    return f"Tool error: {e}"
        return f"Unknown tool: {tool_call.name}"

    async def _should_finish(self, thought: str) -> bool:
        """
        Check if the agent has reached a conclusion.
        Looks for FINAL ANSWER marker or max thought depth reached.
        """
        finish_markers = ["FINAL ANSWER:", "CONCLUSION:", "[DONE]"]
        return any(marker in thought for marker in finish_markers)

    def _parse_tool_call(self, thought: str) -> ToolCall | None:
        """
        Parse a tool call from the agent's thought.
        Expected format: TOOL: tool_name(arg1="value1", arg2="value2")
        Also supports unquoted values: TOOL: tool_name(limit=10, verbose=true)
        Returns None if no tool call found.
        """
        pattern = r'TOOL:\s*(\w+)\(([^)]*)\)'
        match = re.search(pattern, thought)
        if not match:
            return None

        tool_name = match.group(1)
        args_str = match.group(2)

        args = {}
        if args_str.strip():
            # Match: key="value", key='value', or key=unquoted_value
            arg_pattern = r'(\w+)=(?:["\']([^"\']*)["\']|([^\s,)]+))'
            for arg_match in re.finditer(arg_pattern, args_str):
                key = arg_match.group(1)
                # group(2) = quoted value, group(3) = unquoted value
                raw = arg_match.group(2) if arg_match.group(2) is not None else arg_match.group(3)
                # Coerce types
                if raw.lower() == "true":
                    args[key] = True
                elif raw.lower() == "false":
                    args[key] = False
                else:
                    try:
                        args[key] = int(raw)
                    except ValueError:
                        try:
                            args[key] = float(raw)
                        except ValueError:
                            args[key] = raw

        return ToolCall(name=tool_name, args=args)

    def _synthesize_output(self) -> str:
        """
        Combine working memory into a final coherent output string.
        Extracts content after FINAL ANSWER marker if present.
        """
        for entry in reversed(self.working_memory):
            if "FINAL ANSWER:" in entry.content:
                idx = entry.content.index("FINAL ANSWER:")
                return entry.content[idx + len("FINAL ANSWER:"):].strip()

        # Fallback: join all thoughts
        thoughts = [e.content for e in self.working_memory if e.role == "thought"]
        return "\n\n".join(thoughts) if thoughts else "No output generated."

    def _build_react_messages(self) -> list[dict]:
        """Build the messages list for the current ReAct iteration."""
        messages = [{"role": "user", "content": self.context_window}]
        for entry in self.working_memory:
            role = "assistant" if entry.role == "thought" else "user"
            prefix = "" if entry.role == "thought" else f"[{entry.role.upper()}] "
            messages.append({"role": role, "content": f"{prefix}{entry.content}"})
        return messages

    def _build_chat_messages(self, user_message: str) -> list[dict]:
        """Build chat messages including long-term memory for context."""
        messages = [{"role": "user", "content": self.context_window}]
        for entry in self.long_term_memory[-10:]:  # last 10 for context window
            role = "assistant" if entry.role in ("thought", "output") else "user"
            messages.append({"role": role, "content": entry.content})
        messages.append({"role": "user", "content": user_message})
        return messages

    # ── WebSocket events ──────────────────────────────────────────────────

    async def emit(self, event_type: str, data: dict) -> None:
        """Send a WebSocket event for this agent's session."""
        if self.ws_manager is None:
            return
        await self.ws_manager.send_to_session(self.session_id, {
            "type": event_type,
            "data": data,
        })

    async def emit_token(self, token: str) -> None:
        """Stream a single token to the frontend."""
        await self.emit("agent_token", {"agent_id": self.id, "token": token})

    # ── Serialization ─────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        """Serialize agent metadata for API responses and DB storage."""
        return {
            "id": self.id,
            "name": self.name,
            "persona": self.persona,
            "role": self.role,
            "stage": self.stage,
            "dependencies": self.dependencies,
            "status": self.status.value,
            "output": self.output,
        }
