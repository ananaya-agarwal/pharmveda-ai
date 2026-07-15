import datetime

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str

    model_config = {"from_attributes": True}


class MedicineOut(BaseModel):
    id: int
    name: str
    dosage: str | None
    frequency: str | None

    model_config = {"from_attributes": True}


class MedicineUpdate(BaseModel):
    name: str
    dosage: str | None = None
    frequency: str | None = None


class LabValueOut(BaseModel):
    id: int
    test_name: str
    value: float
    unit: str | None
    taken_at: datetime.datetime | None

    model_config = {"from_attributes": True}


class LabValueUpdate(BaseModel):
    test_name: str
    value: float
    unit: str | None = None
    taken_at: datetime.datetime | None = None


class DocumentOut(BaseModel):
    id: int
    filename: str
    doc_type: str
    uploaded_at: datetime.datetime
    extracted_date: datetime.datetime | None
    raw_ocr_text: str | None
    explanation: str | None
    medicines: list[MedicineOut] = []
    lab_values: list[LabValueOut] = []

    model_config = {"from_attributes": True}


class DocumentSummaryOut(BaseModel):
    id: int
    filename: str
    doc_type: str
    uploaded_at: datetime.datetime
    extracted_date: datetime.datetime | None

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    question: str
