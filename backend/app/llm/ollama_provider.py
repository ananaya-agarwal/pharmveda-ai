import json
from collections.abc import Iterator

import requests

from app.config import settings
from app.llm.base import LLMProvider


class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str | None = None, model: str | None = None):
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model

    def _payload(self, system_prompt: str, user_prompt: str, stream: bool) -> dict:
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": stream,
            # Decode (token generation) dominates latency on CPU-only inference -
            # roughly linear in output length, so this is a safety ceiling against
            # runaway/rambling generations, not the primary length control (that's
            # the conciseness instruction in the system prompt - a hard cap alone
            # risks truncating a real answer mid-sentence).
            "options": {"num_predict": 500},
            # Keep the model resident between requests during a session so it
            # isn't evicted (Ollama's default is ~5min idle) and reloaded from
            # disk on the next explain/chat call.
            "keep_alive": "30m",
        }

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = requests.post(
            f"{self.base_url}/api/chat",
            json=self._payload(system_prompt, user_prompt, stream=False),
            timeout=180,
        )
        response.raise_for_status()
        return response.json()["message"]["content"].strip()

    def stream(self, system_prompt: str, user_prompt: str) -> Iterator[str]:
        with requests.post(
            f"{self.base_url}/api/chat",
            json=self._payload(system_prompt, user_prompt, stream=True),
            stream=True,
            timeout=180,
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                content = chunk.get("message", {}).get("content")
                if content:
                    yield content
                if chunk.get("done"):
                    break
