from app.config import settings
from app.llm.base import LLMProvider


def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "ollama":
        from app.llm.ollama_provider import OllamaProvider

        return OllamaProvider()
    if settings.llm_provider == "hosted":
        from app.llm.hosted_provider import HostedFreeTierProvider

        return HostedFreeTierProvider()
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider}")
