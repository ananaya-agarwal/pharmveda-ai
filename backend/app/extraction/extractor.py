import re
from dataclasses import dataclass, field

from dateutil import parser as dateparser

from app.extraction.nlp import get_nlp

DOSAGE_RE = re.compile(
    r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|ml|g|iu|units?)\b(?!\s*/)", re.IGNORECASE
)

FREQUENCY_RE = re.compile(
    r"\b(once|twice|thrice|three times|four times)\s+(a\s+)?day\b"
    r"|\bonce daily\b|\btwice daily\b|\bthrice daily\b"
    r"|\bevery\s+\d+\s+hours?\b"
    r"|\bOD\b|\bBD\b|\bTDS\b|\bQID\b|\bHS\b"
    r"|\bbefore food\b|\bafter food\b|\bat bedtime\b|\bmorning\b|\bnight\b|\bnoon\b",
    re.IGNORECASE,
)

MED_PREFIX_RE = re.compile(
    r"^(?:\d+[\.\)]\s*)?(?:tab\.?|cap\.?|inj\.?|syrup|tablet|capsule)?\s*", re.IGNORECASE
)

# "Test Name: 7.2 %" or "Test Name - 13.5 g/dL" or "Test Name 13.5 g/dL"
LAB_LINE_RE = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9()/\-\s]{2,40}?)\s*[:\-]?\s+"
    r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>[A-Za-z%/µ]{0,15})"
)

DATE_TOKEN_RE = re.compile(
    r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b"
    r"|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b"
    r"|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b",
    re.IGNORECASE,
)

DOCTOR_LINE_RE = re.compile(r"\bDr\.?\s+[A-Z][a-zA-Z.]+(?:\s+[A-Z][a-zA-Z.]+)?\b")
FACILITY_LINE_RE = re.compile(r"\b[A-Z][a-zA-Z]*\s*(Hospital|Clinic|Medical Center|Diagnostics|Labs?)\b")

# Words that should never be treated as a lab test name even if they match the shape.
LAB_NAME_STOPWORDS = {"tab", "cap", "inj", "dose", "date", "age", "sex", "name", "id"}

# Units that are never real lab units - catches prose like "Follow up in 4 weeks"
# matching the same "name <number> <unit>" shape as a genuine lab value line.
NON_LAB_UNITS = {"week", "weeks", "day", "days", "month", "months", "year", "years"}


@dataclass
class ExtractedMedicine:
    name: str
    dosage: str | None
    frequency: str | None
    raw_span: str


@dataclass
class ExtractedLabValue:
    test_name: str
    value: float
    unit: str | None


@dataclass
class ExtractedFields:
    medicines: list[ExtractedMedicine] = field(default_factory=list)
    lab_values: list[ExtractedLabValue] = field(default_factory=list)
    dates: list = field(default_factory=list)
    doctor: str | None = None
    facility: str | None = None


def _clean_med_name(text: str) -> str:
    text = MED_PREFIX_RE.sub("", text).strip(" -:\t")
    return text


def _parse_date_token(token: str):
    try:
        return dateparser.parse(token, dayfirst=True, fuzzy=True)
    except (ValueError, OverflowError):
        return None


def extract_fields(raw_text: str) -> ExtractedFields:
    result = ExtractedFields()
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    for line in lines:
        dosage_match = DOSAGE_RE.search(line)
        if dosage_match:
            name = _clean_med_name(line[: dosage_match.start()])
            if not name:
                continue
            freq_match = FREQUENCY_RE.search(line[dosage_match.end():])
            result.medicines.append(
                ExtractedMedicine(
                    name=name,
                    dosage=dosage_match.group(0).strip(),
                    frequency=freq_match.group(0).strip() if freq_match else None,
                    raw_span=line,
                )
            )
            continue

        lab_match = LAB_LINE_RE.match(line)
        if lab_match:
            name = lab_match.group("name").strip(" -:\t")
            unit = lab_match.group("unit")
            if (
                name.lower() in LAB_NAME_STOPWORDS
                or len(name) < 2
                or unit.lower().rstrip(".") in NON_LAB_UNITS
            ):
                pass
            else:
                result.lab_values.append(
                    ExtractedLabValue(
                        test_name=name,
                        value=float(lab_match.group("value")),
                        unit=lab_match.group("unit") or None,
                    )
                )
            continue

        if result.doctor is None:
            doc_match = DOCTOR_LINE_RE.search(line)
            if doc_match:
                result.doctor = doc_match.group(0)

        if result.facility is None:
            fac_match = FACILITY_LINE_RE.search(line)
            if fac_match:
                result.facility = fac_match.group(0)

    for token_match in DATE_TOKEN_RE.finditer(raw_text):
        parsed = _parse_date_token(token_match.group(0))
        if parsed is not None:
            result.dates.append(parsed)

    _supplement_with_spacy(raw_text, result)

    return result


def _supplement_with_spacy(raw_text: str, result: ExtractedFields) -> None:
    """Fill gaps regex missed (doctor/facility/dates) using spaCy NER.
    Not used for medicines/labs - regex is more reliable for those fixed-shape fields.
    """
    doc = get_nlp()(raw_text)
    for ent in doc.ents:
        if ent.label_ == "PERSON" and result.doctor is None and "dr" in ent.sent.text.lower()[:20]:
            result.doctor = ent.text
        elif ent.label_ == "ORG" and result.facility is None:
            result.facility = ent.text
        elif ent.label_ == "DATE" and not result.dates:
            parsed = _parse_date_token(ent.text)
            if parsed is not None:
                result.dates.append(parsed)
