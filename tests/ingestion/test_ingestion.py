import pytest
from backend.ingestion.router import ingest, InputType
from backend.ingestion.code import extract_zip, extract_text_file


# ── Code (raw paste) ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ingest_code_returns_string():
    result = await ingest("code", "def hello(): pass")
    assert result == "def hello(): pass"


@pytest.mark.asyncio
async def test_ingest_code_bytes_decoded():
    result = await ingest("code", b"def world(): pass")
    assert "def world" in result


# ── PDF sniff ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ingest_file_pdf_magic_bytes():
    # Fake PDF bytes (starts with %PDF)
    fake_pdf = b"%PDF-1.4 fake content"
    result = await ingest("file", fake_pdf)
    # Should attempt PDF extraction (may fail gracefully since not a real PDF)
    assert isinstance(result, str)


# ── ZIP extraction ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_extract_zip_returns_code_files():
    import io
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("main.py", "def hello(): pass\n")
        zf.writestr("utils.py", "import os\n")
        zf.writestr("README.md", "# My project\n")
    zip_bytes = buf.getvalue()

    result = await extract_zip(zip_bytes)
    assert "def hello" in result


@pytest.mark.asyncio
async def test_extract_zip_skips_node_modules():
    import io
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("node_modules/lodash/index.js", "var lodash = {};")
        zf.writestr("src/app.js", "console.log('hello')")
    zip_bytes = buf.getvalue()

    result = await extract_zip(zip_bytes)
    assert "lodash" not in result
    assert "console.log" in result


@pytest.mark.asyncio
async def test_extract_zip_bad_zip():
    result = await extract_zip(b"not a zip file")
    assert "Invalid zip" in result


# ── Text file ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_extract_text_file():
    result = await extract_text_file(b"Hello world code here", "test.py")
    assert "Hello world" in result


# ── InputType enum ────────────────────────────────────────────────────────

def test_input_type_values():
    assert InputType.PDF == "pdf"
    assert InputType.GITHUB == "github"
    assert InputType.CODE == "code"


# ── Unknown input_type falls back gracefully ──────────────────────────────

@pytest.mark.asyncio
async def test_ingest_unknown_type_falls_back():
    result = await ingest("weird_format", "some content")
    assert isinstance(result, str)
