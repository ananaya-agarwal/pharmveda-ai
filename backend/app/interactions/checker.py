import csv
from dataclasses import dataclass
from pathlib import Path

INTERACTIONS_CSV = Path(__file__).resolve().parents[2] / "seed_data" / "interactions.csv"


@dataclass
class InteractionWarning:
    drug_a: str
    drug_b: str
    severity: str
    description: str


def _normalize(name: str) -> str:
    return name.strip().lower()


def _load_interactions() -> list[tuple[str, str, str, str]]:
    rows = []
    with open(INTERACTIONS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(
                (
                    _normalize(row["drug_a"]),
                    _normalize(row["drug_b"]),
                    row["severity"],
                    row["description"],
                )
            )
    return rows


def check_interactions(medicine_names: list[str]) -> list[InteractionWarning]:
    """Pairwise-check the given medicine names against the curated interactions CSV.
    Matching is substring-based (normalized, lowercased) since OCR'd/extracted names
    won't always exactly match the canonical drug name in the CSV.
    """
    interactions = _load_interactions()
    normalized_names = [(name, _normalize(name)) for name in medicine_names]
    warnings: list[InteractionWarning] = []

    for i in range(len(normalized_names)):
        for j in range(i + 1, len(normalized_names)):
            name_a, norm_a = normalized_names[i]
            name_b, norm_b = normalized_names[j]
            for drug_a, drug_b, severity, description in interactions:
                match = (drug_a in norm_a and drug_b in norm_b) or (
                    drug_a in norm_b and drug_b in norm_a
                )
                if match:
                    warnings.append(
                        InteractionWarning(
                            drug_a=name_a, drug_b=name_b, severity=severity, description=description
                        )
                    )

    return warnings
