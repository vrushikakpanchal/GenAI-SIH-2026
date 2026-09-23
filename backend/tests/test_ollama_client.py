import httpx
import pytest

import app.services.ai.ollama_client as ollama_module
from app.services.ai.ollama_client import OllamaClient


@pytest.mark.asyncio
async def test_generation_retries_a_transient_connection_failure(monkeypatch):
    """A brief ngrok connection failure must not produce a fake advisory."""

    class FakeAsyncClient:
        attempts = 0

        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, *args, **kwargs):
            type(self).attempts += 1
            if type(self).attempts == 1:
                raise httpx.ConnectError("transient tunnel reset")
            return httpx.Response(200, json={"response": '{"status":"ok"}'})

    async def no_wait(_seconds):
        return None

    monkeypatch.setattr(ollama_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(ollama_module.asyncio, "sleep", no_wait)

    client = OllamaClient(base_url="https://example.invalid", model="qwen2.5:14b")
    client.max_retries = 1

    response = await client.generate_completion("system", "prompt")

    assert response == '{"status":"ok"}'
    assert FakeAsyncClient.attempts == 2
