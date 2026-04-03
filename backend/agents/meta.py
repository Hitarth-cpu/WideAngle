from __future__ import annotations
from backend.agents.base import Agent
from backend.core.ollama import OllamaClient

META_SYSTEM_PROMPT = """You are a Senior Strategic Analyst synthesizing expert agent analyses.

Produce a structured final report with EXACTLY these sections:

## Executive Summary
[2-3 sentences]

## Key Findings
[Bulleted list of most important insights]

## Critical Risks
[Top risks ordered by severity]

## Action Items
[Prioritized concrete next steps]

## Overall Assessment
[One paragraph verdict with confidence score 1-10]

FINAL ANSWER: [your complete structured report]"""


class MetaSynthesizer(Agent):
    def __init__(self, session_id: str, ws_manager, ollama: OllamaClient):
        super().__init__(
            name="Meta Synthesizer",
            persona="A Senior Strategic Analyst who synthesizes expert opinions into actionable insights.",
            role="Synthesize all expert analyses into a final structured report.",
            stage=99, dependencies=[], session_id=session_id,
            ws_manager=ws_manager, max_iterations=1,
        )
        self._ollama = ollama

    def build_system_prompt(self) -> str:
        return META_SYSTEM_PROMPT

    async def call_llm(self, system: str, messages: list[dict]) -> str:
        user_content = messages[-1]["content"] if messages else ""
        return await self._ollama.complete(system, user_content)

    async def stream_llm(self, system: str, messages: list[dict]) -> str:
        async def on_token(token: str):
            await self.emit_token(token)
        return await self._ollama.stream(system, messages, on_token=on_token)
