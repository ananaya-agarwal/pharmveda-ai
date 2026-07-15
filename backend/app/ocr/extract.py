import re
from pathlib import Path

import fitz  # PyMuPDF
import pytesseract
from PIL import Image, ImageOps

from app.config import settings

pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

PDF_RENDER_DPI = 300

# Tesseract wants roughly 300dpi / 20-30px character height to read reliably; photos
# and small scans commonly fall short of that. Upscale (never downscale) up to this
# floor width before OCR. Kept modest deliberately: testing showed aggressive
# upscaling (e.g. 1.6x on an already-adequate 1000px image) trades one digit
# misread for a different letter misread elsewhere ("HbA1c" -> "HbAic") - so this
# only kicks in for genuinely small/low-res source images.
MIN_OCR_WIDTH = 1000

# psm 6 ("assume a single uniform block of text") suits prescriptions/lab reports
# better than the default automatic page segmentation, which is tuned for full pages
# with multiple columns/blocks and can mis-order sparse, single-column text.
TESSERACT_CONFIG = "--oem 3 --psm 6"

# Characters Tesseract's LSTM engine occasionally confuses with digits at small glyph
# sizes (observed in testing: "500mg" misread as "5@@mg" depending on exact scale).
# Only corrected inside a number-like token immediately followed by a dosage/lab
# unit, so ordinary prose is never touched - and only when the token already has a
# genuine digit, so units on their own (e.g. a stray "mg") are left alone.
_CONFUSABLE_CHARS = "@§#oOlI"
_DOSAGE_TOKEN_RE = re.compile(
    rf"\b(?=[\d{_CONFUSABLE_CHARS}]*\d)[\d{_CONFUSABLE_CHARS}]{{1,6}}"
    r"(?=\s?(?:mg|mcg|ml|g|iu|units?)\b)",
    re.IGNORECASE,
)
_CONFUSABLE_TRANSLATION = str.maketrans(
    {"@": "0", "§": "0", "#": "0", "o": "0", "O": "0", "l": "1", "I": "1"}
)


def _fix_digit_confusions(text: str) -> str:
    return _DOSAGE_TOKEN_RE.sub(lambda m: m.group(0).translate(_CONFUSABLE_TRANSLATION), text)


def _preprocess(image: Image.Image) -> Image.Image:
    # Respect EXIF orientation. Phone cameras frequently store photos "sideways"
    # with a rotation tag rather than rotating the pixels; without correcting for
    # it, Tesseract sees the raw unrotated image and OCR output is close to garbage.
    image = ImageOps.exif_transpose(image)

    # NOTE: Tesseract accuracy on handwritten prescriptions is poor regardless of
    # preprocessing - this PoC targets printed/typed documents.
    #
    # Deliberately NOT binarizing (fixed threshold or Otsu) here: both measurably
    # hurt digit accuracy in testing (e.g. "500mg" misread as "5@@mg") by breaking
    # up anti-aliased glyph edges. Tesseract's LSTM engine (v4+) handles grayscale
    # input well on its own; autocontrast alone improves low-contrast scans
    # without introducing that artifact.
    gray = ImageOps.grayscale(image)
    contrasted = ImageOps.autocontrast(gray)

    if contrasted.width < MIN_OCR_WIDTH:
        scale = MIN_OCR_WIDTH / contrasted.width
        new_size = (MIN_OCR_WIDTH, round(contrasted.height * scale))
        contrasted = contrasted.resize(new_size, Image.LANCZOS)

    return contrasted


def _pdf_to_images(path: Path) -> list[Image.Image]:
    images = []
    doc = fitz.open(path)
    zoom = PDF_RENDER_DPI / 72
    matrix = fitz.Matrix(zoom, zoom)
    for page in doc:
        pix = page.get_pixmap(matrix=matrix)
        images.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    doc.close()
    return images


def extract_text(file_path: str) -> str:
    path = Path(file_path)
    if path.suffix.lower() == ".pdf":
        pages = _pdf_to_images(path)
    else:
        pages = [Image.open(path)]

    texts = []
    for page in pages:
        processed = _preprocess(page)
        texts.append(pytesseract.image_to_string(processed, config=TESSERACT_CONFIG))

    raw_text = "\n\n".join(texts).strip()
    return _fix_digit_confusions(raw_text)
