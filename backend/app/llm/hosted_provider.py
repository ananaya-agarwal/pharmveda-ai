import requests

from app.config import settings
from app.llm.base import LLMProvider


class HostedFreeTierProvider(LLMProvider):
    """Fallback LLM provider for when local Ollama inference is too slow on the dev
    machine. Supports Google Gemini or Groq free tiers, chosen via
    HOSTED_LLM_PROVIDER. Both have real rate limits on their free tiers (Gemini:
    ~15 requests/min on 1.5-flash as of writing; Groq: model-dependent per-day token
    caps) - if you hit them during a demo, that's the free tier, not a bug.
    """

    def __init__(self):
        if not settings.hosted_llm_api_key:
            raise RuntimeError(
                "HOSTED_LLM_API_KEY is not set. Get a free key from Google AI Studio "
                "(Gemini) or console.groq.com (Groq) and set it in .env."
            )
        self.provider = settings.hosted_llm_provider
        self.model = settings.hosted_llm_model
        self.api_key = settings.hosted_llm_api_key

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        if self.provider == "gemini":
            return self._generate_gemini(system_prompt, user_prompt)
        if self.provider == "groq":
            return self._generate_groq(system_prompt, user_prompt)
        raise ValueError(f"Unknown hosted LLM provider: {self.provider}")

    def _generate_gemini(self, system_prompt: str, user_prompt: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={self.api_key}"
        )
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        }
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    def _generate_groq(self, system_prompt: str, user_prompt: str) -> str:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
