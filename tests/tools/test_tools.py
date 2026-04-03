import pytest
import os
import tempfile
from pathlib import Path
from backend.tools.document_reader import DocumentReaderTool
from backend.tools.market_calculator import MarketCalculatorTool
from backend.tools.code_search import CodeSearchTool, ReadFileTool
from backend.tools.static_analysis import StaticAnalysisTool


# ── DocumentReaderTool ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_document_reader_full_returns_text():
    tool = DocumentReaderTool("Hello world document content here")
    result = await tool.execute(section="full")
    assert "Hello world" in result


@pytest.mark.asyncio
async def test_document_reader_caps_at_6000_chars():
    long_text = "x" * 10000
    tool = DocumentReaderTool(long_text)
    result = await tool.execute(section="full")
    assert len(result) <= 6000


@pytest.mark.asyncio
async def test_document_reader_finds_section():
    doc = "Intro text\n## Market\nBig market here\n## Technology\nTech stuff"
    tool = DocumentReaderTool(doc)
    result = await tool.execute(section="market")
    assert "Big market here" in result
    assert "Tech stuff" not in result


@pytest.mark.asyncio
async def test_document_reader_section_not_found_returns_full():
    tool = DocumentReaderTool("Just some content without any headers")
    result = await tool.execute(section="nonexistent")
    assert "not found" in result.lower() or "Just some content" in result


# ── MarketCalculatorTool ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_market_calculator_returns_tam_sam_som():
    tool = MarketCalculatorTool()
    result = await tool.execute(industry="SaaS", geography="US")
    assert "TAM" in result
    assert "SAM" in result
    assert "SOM" in result


@pytest.mark.asyncio
async def test_market_calculator_includes_industry_and_geo():
    tool = MarketCalculatorTool()
    result = await tool.execute(industry="FinTech", geography="Europe")
    assert "FinTech" in result
    assert "Europe" in result


# ── CodeSearchTool ────────────────────────────────────────────────────────

@pytest.fixture
def temp_codebase(tmp_path):
    (tmp_path / "main.py").write_text("def hello(): pass\n# TODO: fix this\n")
    (tmp_path / "utils.py").write_text("import os\npassword = 'hardcoded'\n")
    (tmp_path / "subdir").mkdir()
    (tmp_path / "subdir" / "module.py").write_text("def world(): pass\n")
    return str(tmp_path)


@pytest.mark.asyncio
async def test_code_search_finds_pattern(temp_codebase):
    tool = CodeSearchTool(temp_codebase)
    result = await tool.execute(pattern="TODO")
    assert "TODO: fix this" in result


@pytest.mark.asyncio
async def test_code_search_no_match(temp_codebase):
    tool = CodeSearchTool(temp_codebase)
    result = await tool.execute(pattern="ZZZNONEXISTENT")
    assert "No matches found" in result


@pytest.mark.asyncio
async def test_code_search_requires_pattern(temp_codebase):
    tool = CodeSearchTool(temp_codebase)
    result = await tool.execute(pattern="")
    assert "required" in result.lower()


@pytest.mark.asyncio
async def test_code_search_invalid_regex(temp_codebase):
    tool = CodeSearchTool(temp_codebase)
    result = await tool.execute(pattern="[invalid")
    assert "Invalid regex" in result


# ── ReadFileTool ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_read_file_returns_contents(temp_codebase):
    tool = ReadFileTool(temp_codebase)
    result = await tool.execute(path="main.py")
    assert "def hello" in result


@pytest.mark.asyncio
async def test_read_file_not_found(temp_codebase):
    tool = ReadFileTool(temp_codebase)
    result = await tool.execute(path="nonexistent.py")
    assert "not found" in result.lower()


@pytest.mark.asyncio
async def test_read_file_path_traversal_blocked(temp_codebase):
    tool = ReadFileTool(temp_codebase)
    result = await tool.execute(path="../../etc/passwd")
    assert "traversal" in result.lower() or "not found" in result.lower() or "not allowed" in result.lower()


@pytest.mark.asyncio
async def test_read_file_requires_path(temp_codebase):
    tool = ReadFileTool(temp_codebase)
    result = await tool.execute(path="")
    assert "required" in result.lower()
