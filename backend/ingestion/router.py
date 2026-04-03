import logging
from enum import Enum

logger = logging.getLogger(__name__)


class InputType(str, Enum):
    PDF = "pdf"
    GITHUB = "github"
    CODE = "code"           # raw code text paste
    FILE = "file"           # generic uploaded file (txt, docx, zip, code)
    DOCX = "docx"
    ZIP = "zip"


async def ingest(input_type: str, content) -> str:
    """
    Route input to the correct extractor and return normalized text.

    Args:
        input_type: One of "pdf", "github", "code", "file", "docx", "zip"
        content: bytes for file types, str for code/github

    Returns:
        Normalized plain text string for the Planner Agent.
    """
    input_type = input_type.lower().strip()

    if input_type == InputType.CODE:
        if not isinstance(content, str):
            content = content.decode("utf-8", errors="ignore")
        return content

    if input_type == InputType.GITHUB:
        from backend.ingestion.github import clone_and_extract
        return await clone_and_extract(str(content))

    if input_type == InputType.PDF:
        from backend.ingestion.pdf import extract_pdf
        return await extract_pdf(bytes(content))

    if input_type == InputType.DOCX:
        from backend.ingestion.code import extract_docx
        return await extract_docx(bytes(content))

    if input_type == InputType.ZIP:
        from backend.ingestion.code import extract_zip
        return await extract_zip(bytes(content))

    if input_type == InputType.FILE:
        # Detect by content sniffing
        if isinstance(content, bytes):
            if content[:4] == b"%PDF":
                from backend.ingestion.pdf import extract_pdf
                return await extract_pdf(content)
            if content[:2] == b"PK":  # ZIP magic bytes
                from backend.ingestion.code import extract_zip
                return await extract_zip(content)
            # Try docx (also a zip internally but with specific structure)
            from backend.ingestion.code import extract_text_file
            return await extract_text_file(content)
        return str(content)

    logger.warning(f"Unknown input_type: {input_type}, treating as code")
    return str(content)
