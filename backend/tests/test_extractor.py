from app.extraction.extractor import extract_fields

SAMPLE_PRESCRIPTION = """
Dr. Anita Sharma
City Care Hospital
Date: 15/03/2024

Tab. Metformin 500mg twice daily after food
Tab. Atorvastatin 10mg once daily at bedtime
"""

SAMPLE_LAB_REPORT = """
City Diagnostics Labs
Date: 20 Mar 2024

Hemoglobin: 13.5 g/dL
HbA1c: 7.2 %
Creatinine: 1.1 mg/dL
"""


def test_extracts_medicines_with_dosage_and_frequency():
    fields = extract_fields(SAMPLE_PRESCRIPTION)
    names = {m.name.lower() for m in fields.medicines}

    assert "metformin" in names
    assert "atorvastatin" in names

    metformin = next(m for m in fields.medicines if m.name.lower() == "metformin")
    assert "500mg" in metformin.dosage.lower()
    assert metformin.frequency is not None


def test_extracts_lab_values_with_units():
    fields = extract_fields(SAMPLE_LAB_REPORT)
    by_name = {lab.test_name.lower(): lab for lab in fields.lab_values}

    assert by_name["hemoglobin"].value == 13.5
    assert by_name["hemoglobin"].unit.lower() == "g/dl"
    assert by_name["hba1c"].value == 7.2
    assert by_name["creatinine"].value == 1.1


def test_extracts_at_least_one_date():
    fields = extract_fields(SAMPLE_PRESCRIPTION)
    assert len(fields.dates) >= 1
