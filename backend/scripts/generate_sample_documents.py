"""Generates synthetic (non-real) sample prescription/lab report images for the
demo, since real patient documents can't be used. Renders plain text onto a white
canvas with a monospace font - clean and typed, matching the OCR accuracy caveat
noted in README (Tesseract struggles with handwriting; these samples are printed-style
on purpose).
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "seed_data" / "sample_documents"

PRESCRIPTION_1 = """Dr. Anita Sharma, MBBS MD
City Care Hospital

Patient: J. Doe
Date: 15/03/2024

Rx:
Tab. Metformin 500mg twice daily after food
Tab. Atorvastatin 10mg once daily at bedtime
Tab. Lisinopril 10mg once daily morning

Follow up in 4 weeks.
"""

LAB_REPORT_1 = """City Diagnostics Labs
Patient: J. Doe
Date: 20 Mar 2024

Test Results:
Hemoglobin: 13.5 g/dL
HbA1c: 7.2 %
Creatinine: 1.1 mg/dL
Fasting Glucose: 118 mg/dL
LDL Cholesterol: 142 mg/dL

Referred by: Dr. Anita Sharma
"""

LAB_REPORT_2 = """City Diagnostics Labs
Patient: J. Doe
Date: 18 Jun 2024

Test Results:
Hemoglobin: 13.1 g/dL
HbA1c: 6.8 %
Creatinine: 1.0 mg/dL
Fasting Glucose: 105 mg/dL
LDL Cholesterol: 128 mg/dL

Referred by: Dr. Anita Sharma
"""

PRESCRIPTION_2 = """Dr. Anita Sharma, MBBS MD
City Care Hospital

Patient: J. Doe
Date: 18/06/2024

Rx:
Tab. Metformin 500mg twice daily after food
Tab. Warfarin 5mg once daily
Tab. Aspirin 75mg once daily morning

Follow up in 6 weeks.
"""


def _find_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def render_text_to_image(text: str, out_path: Path, font_size: int = 28) -> None:
    font = _find_font(font_size)
    lines = text.strip("\n").split("\n")

    line_height = int(font_size * 1.4)
    width = 1000
    height = line_height * (len(lines) + 2)

    image = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(image)

    y = line_height
    for line in lines:
        draw.text((40, y), line, fill="black", font=font)
        y += line_height

    image.save(out_path)
    print(f"Wrote {out_path}")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    render_text_to_image(PRESCRIPTION_1, OUTPUT_DIR / "sample_prescription_1.png")
    render_text_to_image(LAB_REPORT_1, OUTPUT_DIR / "sample_lab_report_1.png")
    render_text_to_image(LAB_REPORT_2, OUTPUT_DIR / "sample_lab_report_2.png")
    render_text_to_image(PRESCRIPTION_2, OUTPUT_DIR / "sample_prescription_2.png")


if __name__ == "__main__":
    main()
