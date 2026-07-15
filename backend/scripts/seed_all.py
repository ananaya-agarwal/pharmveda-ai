"""Seeds ChromaDB with the curated reference docs. Run once after first install
(the app also runs this automatically on every startup - it's idempotent).
The interactions CSV doesn't need a separate load step: it's read directly from
seed_data/interactions.csv at request time (see app/interactions/checker.py).
"""

from app.rag.seed import seed_reference_docs


def main() -> None:
    count = seed_reference_docs()
    print(f"Seeded {count} reference documents into ChromaDB.")


if __name__ == "__main__":
    main()
