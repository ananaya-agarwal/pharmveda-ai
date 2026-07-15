import chromadb

from app.config import settings
from app.rag.embed import embed_texts

COLLECTION_NAME = "reference_docs"

_client = None


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_dir)
    return _client


def get_collection():
    return get_client().get_or_create_collection(COLLECTION_NAME)


def upsert_documents(ids: list[str], texts: list[str]) -> None:
    collection = get_collection()
    embeddings = embed_texts(texts)
    collection.upsert(ids=ids, documents=texts, embeddings=embeddings)


def query(text: str, top_k: int = 4) -> list[str]:
    collection = get_collection()
    if collection.count() == 0:
        return []
    embedding = embed_texts([text])[0]
    result = collection.query(query_embeddings=[embedding], n_results=min(top_k, collection.count()))
    return result["documents"][0] if result["documents"] else []
