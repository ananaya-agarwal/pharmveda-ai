import requests

from app.config import settings

LOCAL_MODEL_NAME = "all-MiniLM-L6-v2"
# Gemini's embedding model - used instead of a local model when LLM_PROVIDER=hosted,
# since sentence-transformers pulls in the full PyTorch runtime, which is large
# enough to OOM small hosting tiers (e.g. 512MB). Deliberately independent of
# HOSTED_LLM_PROVIDER (which may be "groq" for chat) - Groq has no embeddings API,
# so this always calls Gemini and always needs HOSTED_LLM_API_KEY to be a Gemini key.
GEMINI_EMBED_MODEL = "text-embedding-004"

_local_model = None


def _get_local_embedder():
    global _local_model
    if _local_model is None:
        # Imported here, not at module load, so hosted deployments never pull in
        # sentence-transformers/PyTorch at all - not even the import cost.
        from sentence_transformers import SentenceTransformer

        _local_model = SentenceTransformer(LOCAL_MODEL_NAME)
    return _local_model


def _embed_hosted(texts: list[str]) -> list[list[float]]:
    if not settings.hosted_llm_api_key:
        raise RuntimeError(
            "HOSTED_LLM_API_KEY is not set - required for hosted embeddings (uses "
            "Gemini's embedding API regardless of HOSTED_LLM_PROVIDER, since Groq "
            "doesn't offer one)."
        )
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_EMBED_MODEL}:embedContent?key={settings.hosted_llm_api_key}"
    )
    embeddings = []
    for text in texts:
        response = requests.post(
            url, json={"content": {"parts": [{"text": text}]}}, timeout=30
        )
        response.raise_for_status()
        embeddings.append(response.json()["embedding"]["values"])
    return embeddings


def embed_texts(texts: list[str]) -> list[list[float]]:
    if settings.llm_provider == "hosted":
        return _embed_hosted(texts)
    return _get_local_embedder().encode(texts, convert_to_numpy=True).tolist()
