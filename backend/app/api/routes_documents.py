import shutil
import uuid
from pathlib import Path

from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import (
    DocumentOut,
    DocumentSummaryOut,
    MedicineUpdate,
    LabValueUpdate,
)
from app.config import settings
from app.db.models import Document, LabValue, Medicine, User
from app.db.session import SessionLocal, get_db
from app.extraction.extractor import extract_fields
from app.llm.factory import get_llm_provider
from app.llm.prompts import DOCUMENT_EXPLANATION_SYSTEM_PROMPT, SAFETY_DISCLAIMER
from app.ocr.extract import extract_text

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Document:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{suffix}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    user_dir = Path(settings.upload_dir) / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    storage_path = user_dir / stored_name

    with storage_path.open("wb") as out_file:
        shutil.copyfileobj(file.file, out_file)

    document = Document(
        user_id=user.id,
        filename=file.filename or stored_name,
        storage_path=str(storage_path),
        doc_type="lab_report" if "lab" in (file.filename or "").lower() else "prescription",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    _run_ocr_and_extraction(document, db)
    return document


def _run_ocr_and_extraction(document: Document, db: Session) -> None:
    raw_text = extract_text(document.storage_path)
    document.raw_ocr_text = raw_text

    fields = extract_fields(raw_text)
    if fields.dates:
        document.extracted_date = min(fields.dates)

    for med in fields.medicines:
        db.add(
            Medicine(
                document_id=document.id,
                user_id=document.user_id,
                name=med.name,
                dosage=med.dosage,
                frequency=med.frequency,
                raw_span=med.raw_span,
            )
        )

    for lab in fields.lab_values:
        db.add(
            LabValue(
                document_id=document.id,
                user_id=document.user_id,
                test_name=lab.test_name,
                value=lab.value,
                unit=lab.unit,
                taken_at=document.extracted_date,
            )
        )

    db.commit()
    db.refresh(document)


@router.get("", response_model=list[DocumentSummaryOut])
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )


def _get_owned_document(document_id: int, user: User, db: Session) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return _get_owned_document(document_id, user, db)


@router.put("/{document_id}/medicines/{medicine_id}", response_model=DocumentOut)
def update_medicine(
    document_id: int,
    medicine_id: int,
    payload: MedicineUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = _get_owned_document(document_id, user, db)
    medicine = db.get(Medicine, medicine_id)
    if medicine is None or medicine.document_id != document.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")

    medicine.name = payload.name
    medicine.dosage = payload.dosage
    medicine.frequency = payload.frequency
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}/medicines/{medicine_id}", response_model=DocumentOut)
def delete_medicine(
    document_id: int,
    medicine_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = _get_owned_document(document_id, user, db)
    medicine = db.get(Medicine, medicine_id)
    if medicine is None or medicine.document_id != document.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")

    db.delete(medicine)
    db.commit()
    db.refresh(document)
    return document


@router.put("/{document_id}/lab-values/{lab_value_id}", response_model=DocumentOut)
def update_lab_value(
    document_id: int,
    lab_value_id: int,
    payload: LabValueUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = _get_owned_document(document_id, user, db)
    lab_value = db.get(LabValue, lab_value_id)
    if lab_value is None or lab_value.document_id != document.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab value not found")

    lab_value.test_name = payload.test_name
    lab_value.value = payload.value
    lab_value.unit = payload.unit
    lab_value.taken_at = payload.taken_at
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}/lab-values/{lab_value_id}", response_model=DocumentOut)
def delete_lab_value(
    document_id: int,
    lab_value_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = _get_owned_document(document_id, user, db)
    lab_value = db.get(LabValue, lab_value_id)
    if lab_value is None or lab_value.document_id != document.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab value not found")

    db.delete(lab_value)
    db.commit()
    db.refresh(document)
    return document


def _stream_and_save_explanation(document_id: int, user_prompt: str) -> Iterator[str]:
    provider = get_llm_provider()
    chunks: list[str] = []
    for chunk in provider.stream(DOCUMENT_EXPLANATION_SYSTEM_PROMPT, user_prompt):
        chunks.append(chunk)
        yield chunk
    yield SAFETY_DISCLAIMER

    # The request-scoped `db` dependency is already torn down by the time a
    # streamed response body finishes sending, so persist with a fresh, short-lived
    # session here instead of the one injected into the route handler.
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is not None:
            document.explanation = "".join(chunks).strip() + SAFETY_DISCLAIMER
            db.commit()
    finally:
        db.close()


@router.post("/{document_id}/explain")
def explain_document(
    document_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    document = _get_owned_document(document_id, user, db)

    med_lines = [
        f"- {m.name} {m.dosage or ''} {m.frequency or ''}".strip() for m in document.medicines
    ]
    lab_lines = [f"- {l.test_name}: {l.value} {l.unit or ''}".strip() for l in document.lab_values]

    if not med_lines and not lab_lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No extracted medicines or lab values to explain yet.",
        )

    user_prompt = (
        "Explain the following extracted medical document data in plain language "
        "for a general audience.\n\nMedicines:\n"
        + ("\n".join(med_lines) or "None")
        + "\n\nLab values:\n"
        + ("\n".join(lab_lines) or "None")
    )

    return StreamingResponse(
        _stream_and_save_explanation(document.id, user_prompt), media_type="text/plain"
    )
