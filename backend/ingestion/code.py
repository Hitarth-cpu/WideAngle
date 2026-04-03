import io
import zipfile
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go",
                         ".rs", ".cpp", ".c", ".h", ".cs", ".rb", ".php"}


async def extract_text_file(file_bytes: bytes, filename: str = "") -> str:
    """Extract text from a plain text or code file."""
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception as e:
        return f"[Could not decode file: {e}]"


async def extract_zip(file_bytes: bytes) -> str:
    """Extract and concatenate code files from a zip archive."""
    try:
        sections = []
        total_chars = 0
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            for name in sorted(zf.namelist()):
                if total_chars >= 30_000:
                    break
                path = Path(name)
                if path.suffix not in SUPPORTED_EXTENSIONS:
                    continue
                if any(p in ("node_modules", ".git", "__pycache__", ".venv") for p in path.parts):
                    continue
                try:
                    content = zf.read(name).decode("utf-8", errors="ignore")[:5000]
                    sections.append(f"=== {name} ===\n{content}")
                    total_chars += len(content)
                except Exception:
                    continue

        return "\n\n".join(sections) if sections else "[No code files found in zip]"
    except zipfile.BadZipFile:
        return "[Invalid zip file]"
    except Exception as e:
        return f"[Zip extraction failed: {e}]"


async def extract_docx(file_bytes: bytes) -> str:
    """Extract text from a .docx file."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        return "[DOCX extraction unavailable: install python-docx]"
    except Exception as e:
        return f"[DOCX extraction failed: {e}]"
