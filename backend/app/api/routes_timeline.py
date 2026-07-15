import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import Document, User
from app.db.session import get_db

router = APIRouter(prefix="/timeline", tags=["timeline"])


class TimelineEntry(BaseModel):
    id: int
    doc_type: str
    date: datetime.datetime
    summary: str


def _summarize(document: Document) -> str:
    n_meds = len(document.medicines)
    n_labs = len(document.lab_values)
    parts = []
    if n_meds:
        parts.append(f"{n_meds} medicine{'s' if n_meds != 1 else ''}")
    if n_labs:
        parts.append(f"{n_labs} lab value{'s' if n_labs != 1 else ''}")
    return f"{document.filename}" + (f" — {', '.join(parts)}" if parts else "")


@router.get("", response_model=list[TimelineEntry])
def get_timeline(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    documents = db.query(Document).filter(Document.user_id == user.id).all()
    entries = [
        TimelineEntry(
            id=d.id,
            doc_type=d.doc_type,
            date=d.extracted_date or d.uploaded_at,
            summary=_summarize(d),
        )
        for d in documents
    ]
    return sorted(entries, key=lambda e: e.date)
