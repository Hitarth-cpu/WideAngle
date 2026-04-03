import re
from backend.agents.base import Tool


class DocumentReaderTool:
    """Read a specific section from a document text."""
    name = "read_document"
    description = (
        "Read the full document or a specific section. "
        "Usage: TOOL: read_document(section=\"market\" or section=\"full\")"
    )

    def __init__(self, document_text: str):
        self._text = document_text

    async def execute(self, section: str = "full") -> str:
        if section == "full":
            return self._text[:6000]  # cap for context window

        # Try to find a section header
        pattern = re.compile(
            rf"(?i)(#+\s*{re.escape(section)}|{re.escape(section)}\s*[:—\-])",
        )
        match = pattern.search(self._text)
        if not match:
            return f"Section '{section}' not found. Returning full document excerpt.\n\n{self._text[:3000]}"

        start = match.start()
        # Next header or end of text
        next_header = re.search(r'\n#+\s', self._text[start + 1:])
        end = start + next_header.start() + 1 if next_header else len(self._text)
        return self._text[start:end][:3000]
