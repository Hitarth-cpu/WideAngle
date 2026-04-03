import io
import logging

logger = logging.getLogger(__name__)


async def extract_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF file's bytes."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return "[PDF extraction unavailable: install pymupdf]"

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        text = "\n\n".join(pages)
        if not text.strip():
            return "[PDF appears to be image-only or contains no extractable text]"
        return text
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return f"[PDF extraction failed: {e}]"
