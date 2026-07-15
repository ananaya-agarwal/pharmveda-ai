from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import Medicine, User
from app.db.session import get_db
from app.interactions.checker import check_interactions

router = APIRouter(prefix="/interactions", tags=["interactions"])


class InteractionOut(BaseModel):
    drug_a: str
    drug_b: str
    severity: str
    description: str


@router.get("", response_model=list[InteractionOut])
def get_interactions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    medicines = db.query(Medicine).filter(Medicine.user_id == user.id).all()
    names = list({m.name for m in medicines})
    warnings = check_interactions(names)
    return [
        InteractionOut(
            drug_a=w.drug_a, drug_b=w.drug_b, severity=w.severity, description=w.description
        )
        for w in warnings
    ]
