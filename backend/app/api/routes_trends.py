import datetime
from collections import defaultdict

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import Document, LabValue, User
from app.db.session import get_db

router = APIRouter(prefix="/trends", tags=["trends"])


class TrendPoint(BaseModel):
    date: datetime.datetime
    value: float


class TrendSeries(BaseModel):
    test_name: str
    unit: str | None
    points: list[TrendPoint]


@router.get("", response_model=list[TrendSeries])
def get_trends(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(LabValue, Document)
        .join(Document, LabValue.document_id == Document.id)
        .filter(LabValue.user_id == user.id)
        .all()
    )

    by_test: dict[str, list[tuple[datetime.datetime, float, str | None]]] = defaultdict(list)
    for lab, document in rows:
        key = lab.test_name.strip().lower()
        date = lab.taken_at or document.extracted_date or document.uploaded_at
        by_test[key].append((date, lab.value, lab.unit))

    series = []
    for key, points in by_test.items():
        if len(points) < 2:
            continue
        points.sort(key=lambda p: p[0])
        series.append(
            TrendSeries(
                test_name=key,
                unit=points[0][2],
                points=[TrendPoint(date=p[0], value=p[1]) for p in points],
            )
        )

    return series
