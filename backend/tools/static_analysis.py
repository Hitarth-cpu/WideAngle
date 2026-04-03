import asyncio
import subprocess
from pathlib import Path
from backend.agents.base import Tool


class StaticAnalysisTool:
    """Run static analysis (flake8 for Python, basic checks for others)."""
    name = "run_linter"
    description = (
        "Run static analysis on a file or directory. "
        "Usage: TOOL: run_linter(path=\"backend/\", language=\"python\")"
    )

    def __init__(self, codebase_path: str):
        self._root = Path(codebase_path)

    async def execute(self, path: str = ".", language: str = "python") -> str:
        target = self._root / path
        if not target.exists():
            return f"Path not found: {path}"

        if language.lower() == "python":
            return await self._run_flake8(str(target))
        elif language.lower() in ("javascript", "typescript", "js", "ts"):
            return await self._run_eslint(str(target))
        else:
            return f"Language '{language}' not supported. Supported: python, javascript, typescript"

    async def _run_flake8(self, target: str) -> str:
        try:
            proc = await asyncio.create_subprocess_exec(
                "flake8", target,
                "--max-line-length=120",
                "--exclude=.venv,node_modules,__pycache__,dist",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
            output = stdout.decode() or stderr.decode()
            if not output.strip():
                return "flake8: No issues found."
            lines = output.strip().splitlines()[:50]  # cap output
            return f"flake8 results ({len(lines)} issues shown):\n\n" + "\n".join(lines)
        except FileNotFoundError:
            return "flake8 not installed. Install with: pip install flake8"
        except asyncio.TimeoutError:
            return "flake8 timed out after 30 seconds"

    async def _run_eslint(self, target: str) -> str:
        try:
            proc = await asyncio.create_subprocess_exec(
                "npx", "eslint", target, "--max-warnings=50",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
            output = stdout.decode() or stderr.decode()
            return output[:3000] if output.strip() else "eslint: No issues found."
        except FileNotFoundError:
            return "eslint/npx not available"
        except asyncio.TimeoutError:
            return "eslint timed out after 30 seconds"
