import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from backend.core.ollama import OllamaClient


def make_client() -> OllamaClient:
    return OllamaClient(base_url="http://localhost:11434", model="llama3")


# ── complete() ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_complete_returns_string():
    client = make_client()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock(return_value={
        "message": {"content": "The TAM is $4B."}
    })

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__ = AsyncMock(return_value=MockClient.return_value)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value.post = AsyncMock(return_value=mock_response)

        result = await client.complete("You are an analyst.", "Analyze this.")

    assert result == "The TAM is $4B."


@pytest.mark.asyncio
async def test_complete_raises_on_connect_error():
    import httpx
    client = make_client()

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__ = AsyncMock(return_value=MockClient.return_value)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value.post = AsyncMock(side_effect=httpx.ConnectError("refused"))

        with pytest.raises(ConnectionError, match="Cannot connect to Ollama"):
            await client.complete("system", "user")


# ── stream() ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stream_calls_on_token_per_chunk():
    client = make_client()
    chunks = [
        json.dumps({"message": {"content": "Hello"}, "done": False}),
        json.dumps({"message": {"content": " world"}, "done": True}),
    ]
    tokens = []

    async def fake_aiter_lines():
        for chunk in chunks:
            yield chunk

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.aiter_lines = fake_aiter_lines

    with patch("httpx.AsyncClient") as MockClient:
        mock_stream_ctx = MagicMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value.__aenter__ = AsyncMock(return_value=MockClient.return_value)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value.stream = MagicMock(return_value=mock_stream_ctx)

        result = await client.stream(
            "system", [{"role": "user", "content": "hi"}],
            on_token=lambda t: tokens.append(t)
        )

    assert result == "Hello world"
    assert tokens == ["Hello", " world"]


@pytest.mark.asyncio
async def test_stream_assembles_full_response():
    client = make_client()
    chunks = [
        json.dumps({"message": {"content": "The "}, "done": False}),
        json.dumps({"message": {"content": "answer "}, "done": False}),
        json.dumps({"message": {"content": "is 42"}, "done": True}),
    ]

    async def fake_aiter_lines():
        for chunk in chunks:
            yield chunk

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.aiter_lines = fake_aiter_lines

    with patch("httpx.AsyncClient") as MockClient:
        mock_stream_ctx = MagicMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value.__aenter__ = AsyncMock(return_value=MockClient.return_value)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value.stream = MagicMock(return_value=mock_stream_ctx)

        result = await client.stream("system", [], on_token=lambda t: None)

    assert result == "The answer is 42"


# ── is_available() ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_is_available_returns_true_when_model_present():
    client = make_client()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={
        "models": [{"name": "llama3:latest"}]
    })

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__ = AsyncMock(return_value=MockClient.return_value)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value.get = AsyncMock(return_value=mock_response)

        result = await client.is_available()

    assert result is True


@pytest.mark.asyncio
async def test_is_available_returns_false_on_connect_error():
    import httpx
    client = make_client()

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__ = AsyncMock(return_value=MockClient.return_value)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value.get = AsyncMock(side_effect=httpx.ConnectError("refused"))

        result = await client.is_available()

    assert result is False
