from collections.abc import Iterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import ChatRequest
from app.db.models import LabValue, Medicine, User
from app.db.session import get_db
from app.llm.factory import get_llm_provider
from app.llm.prompts import RAG_CHAT_SYSTEM_PROMPT, SAFETY_DISCLAIMER
from app.rag.seed import seed_reference_docs
from app.rag.store import needs_seeding, query as rag_query

router = APIRouter(prefix="/chat", tags=["chat"])


def _user_health_context(user: User, db: Session) -> str:
    medicines = db.query(Medicine).filter(Medicine.user_id == user.id).all()
    lab_values = db.query(LabValue).filter(LabValue.user_id == user.id).all()

    med_lines = [f"- {m.name} {m.dosage or ''} {m.frequency or ''}".strip() for m in medicines]
    lab_lines = [f"- {l.test_name}: {l.value} {l.unit or ''}".strip() for l in lab_values]

    return (
        "User's extracted medicines:\n" + ("\n".join(med_lines) or "None")
        + "\n\nUser's extracted lab values:\n" + ("\n".join(lab_lines) or "None")
    )


def _stream_chat(user_prompt: str) -> Iterator[str]:
    provider = get_llm_provider()
    for chunk in provider.stream(RAG_CHAT_SYSTEM_PROMPT, user_prompt):
        yield chunk
    yield SAFETY_DISCLAIMER


@router.post("")
def chat(
    payload: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Deferred from app startup (see main.py) so a small hosting tier can boot
    # without loading the embedding model until RAG is actually used. Only pays
    # the load cost once - needs_seeding() is false on every call after the first.
    if needs_seeding():
        seed_reference_docs()

    reference_chunks = rag_query(payload.question, top_k=4)
    reference_text = "\n\n".join(reference_chunks) if reference_chunks else "No matching reference material found."

    user_prompt = (
        f"Reference context:\n{reference_text}\n\n"
        f"{_user_health_context(user, db)}\n\n"
        f"Question: {payload.question}"
    )

    return StreamingResponse(_stream_chat(user_prompt), media_type="text/plain")
