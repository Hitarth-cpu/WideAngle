import os
import re
from pathlib import Path
from backend.agents.base import Tool


class CodeSearchTool:
    """Search for patterns across a codebase."""
    name = "search_pattern"
    description = (
        "Search for a regex pattern across all code files. "
        "Usage: TOOL: search_pattern(pattern=\"TODO|FIXME\", file_ext=\".py\")"
    )

    def __init__(self, codebase_path: str):
        self._root = Path(codebase_path)

    async def execute(self, pattern: str = "", file_ext: str = "") -> str:
        if not pattern:
            return "Error: pattern is required"

        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            return f"Invalid regex pattern: {e}"

        results = []
        search_root = self._root

        for file_path in search_root.rglob("*"):
            if not file_path.is_file():
                continue
            if file_ext and not file_path.suffix == file_ext:
                continue
            # Skip common non-code dirs
            if any(part in file_path.parts for part in ("node_modules", ".venv", "__pycache__", ".git", "dist")):
                continue

            try:
                text = file_path.read_text(encoding="utf-8", errors="ignore")
                for line_num, line in enumerate(text.splitlines(), 1):
                    if regex.search(line):
                        rel = file_path.relative_to(search_root)
                        results.append(f"{rel}:{line_num}: {line.strip()}")
                        if len(results) >= 30:  # cap results
                            break
            except (PermissionError, OSError):
                continue

            if len(results) >= 30:
                break

        if not results:
            return f"No matches found for pattern '{pattern}'"
        return f"Found {len(results)} match(es) for '{pattern}':\n\n" + "\n".join(results)


class ReadFileTool:
    """Read a specific file from the codebase."""
    name = "read_file"
    description = (
        "Read the contents of a specific file. "
        "Usage: TOOL: read_file(path=\"src/main.py\")"
    )

    def __init__(self, codebase_path: str):
        self._root = Path(codebase_path)

    async def execute(self, path: str = "") -> str:
        if not path:
            return "Error: path is required"

        file_path = self._root / path
        # Security: prevent path traversal
        try:
            file_path.resolve().relative_to(self._root.resolve())
        except ValueError:
            return "Error: path traversal not allowed"

        if not file_path.exists():
            return f"File not found: {path}"
        if not file_path.is_file():
            return f"Not a file: {path}"

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            if len(content) > 4000:
                content = content[:4000] + f"\n\n... (truncated, {len(content)} total chars)"
            return f"Contents of {path}:\n\n{content}"
        except (PermissionError, OSError) as e:
            return f"Cannot read file: {e}"
