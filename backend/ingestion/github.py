import os
import tempfile
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# File extensions considered source code
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs",
    ".cpp", ".c", ".h", ".cs", ".rb", ".php", ".swift", ".kt",
    ".md", ".txt", ".yaml", ".yml", ".json", ".toml", ".env.example",
}

# Directories to skip
SKIP_DIRS = {
    "node_modules", ".git", ".venv", "venv", "__pycache__", "dist",
    "build", ".pytest_cache", "coverage", ".mypy_cache",
}

MAX_FILE_SIZE = 50_000  # chars per file
MAX_TOTAL = 30_000      # total chars returned


async def clone_and_extract(repo_url: str) -> str:
    """
    Clone a GitHub repo to a temp directory and extract key source files.
    Returns normalized text with file paths as headers.
    """
    try:
        from git import Repo, InvalidGitRepositoryError, GitCommandError
    except ImportError:
        return "[GitHub ingestion unavailable: install gitpython]"

    with tempfile.TemporaryDirectory() as tmp_dir:
        try:
            logger.info(f"Cloning {repo_url} to {tmp_dir}")
            Repo.clone_from(repo_url, tmp_dir, depth=1)
        except GitCommandError as e:
            return f"[Git clone failed: {e}]"

        return _extract_from_dir(tmp_dir)


def _extract_from_dir(root: str) -> str:
    """Walk a directory and extract text from code files."""
    root_path = Path(root)
    sections = []
    total_chars = 0

    # Prioritize README first
    for readme_name in ("README.md", "README.rst", "README.txt", "README"):
        readme = root_path / readme_name
        if readme.exists():
            text = readme.read_text(encoding="utf-8", errors="ignore")[:5000]
            sections.append(f"=== {readme_name} ===\n{text}")
            total_chars += len(text)
            break

    for file_path in sorted(root_path.rglob("*")):
        if total_chars >= MAX_TOTAL:
            break
        if not file_path.is_file():
            continue
        if file_path.suffix not in CODE_EXTENSIONS:
            continue
        if any(skip in file_path.parts for skip in SKIP_DIRS):
            continue

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except (PermissionError, OSError):
            continue

        if not content.strip():
            continue

        content = content[:MAX_FILE_SIZE]
        rel_path = file_path.relative_to(root_path)
        section = f"=== {rel_path} ===\n{content}"
        sections.append(section)
        total_chars += len(content)

    if not sections:
        return "[No readable source files found in repository]"

    return "\n\n".join(sections)
