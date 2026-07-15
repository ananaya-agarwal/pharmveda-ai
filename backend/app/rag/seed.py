from pathlib import Path

from app.rag.store import upsert_documents

REFERENCE_DOCS_DIR = Path(__file__).resolve().parents[2] / "seed_data" / "reference_docs"


def seed_reference_docs() -> int:
    """Idempotent: re-running with unchanged files just re-upserts the same ids/content."""
    ids, texts = [], []
    for path in sorted(REFERENCE_DOCS_DIR.glob("*.md")):
        ids.append(path.stem)
        texts.append(path.read_text(encoding="utf-8"))

    if texts:
        upsert_documents(ids, texts)
    return len(texts)


if __name__ == "__main__":
    count = seed_reference_docs()
    print(f"Seeded {count} reference documents into ChromaDB.")
