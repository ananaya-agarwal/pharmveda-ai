# PharmVeda AI — Digital Health Twin (Proof of Concept)

A zero-cost proof of concept validating whether AI can extract structured data from a
medical document (prescription or lab report) and explain it in plain language. See
[`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) for a guided walkthrough.

**This is not a diagnostic tool.** It explains and organizes information; it does not
replace a doctor. Every explanation carries a visible disclaimer.

## Prerequisites

- **Python 3.11+** (this project was built and tested against Python 3.11 specifically —
  newer Python versions may lack prebuilt wheels for spaCy/ChromaDB/sentence-transformers)
- **Node.js 18+** and npm
- **Tesseract OCR** (system dependency, not a Python package)
  - Windows: `winget install --id UB-Mannheim.TesseractOCR -e`
  - macOS: `brew install tesseract`
  - Linux: `apt install tesseract-ocr`
  - After installing, confirm the path in `backend/.env` (`TESSERACT_CMD` in
    `app/config.py`) matches where it was installed.
- **Ollama** (for local, free LLM inference)
  - Windows: `winget install --id Ollama.Ollama -e`
  - macOS/Linux: see https://ollama.com/download
  - Then pull a model: `ollama pull llama3.1:8b` (≈4.9GB download; use `ollama pull phi3`
    instead if disk space or RAM is tight — it's smaller and faster but less capable)

## Backend setup

```bash
cd backend
py -3.11 -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
python -m spacy download en_core_web_sm

copy .env.example .env        # Windows: copy, macOS/Linux: cp
# edit .env if your Tesseract/Ollama paths differ from the defaults

uvicorn app.main:app --reload
```

The backend seeds the ChromaDB reference corpus automatically on startup (idempotent —
safe to restart repeatedly). SQLite tables are also created automatically on startup.

Backend runs at `http://localhost:8000`. API docs: `http://localhost:8000/docs`.

### Generating synthetic sample documents (optional, for testing/demo)

```bash
python scripts/generate_sample_documents.py
```

Writes synthetic (not real patient data) prescription/lab report images to
`backend/seed_data/sample_documents/` for use in the demo walkthrough.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api/*` requests to the backend.

## Running tests

```bash
cd backend
pytest
```

Covers deterministic logic only (regex/spaCy field extraction, the interaction
checker, and a safety-language guard on the LLM prompts) — no network or LLM calls
required to run the suite.

## Switching LLM providers

Set `LLM_PROVIDER=ollama` (default, fully local/free) or `LLM_PROVIDER=hosted` in
`backend/.env`. When using `hosted`, also set `HOSTED_LLM_API_KEY` and
`HOSTED_LLM_PROVIDER` (`gemini` or `groq`) — get a free-tier key from
[Google AI Studio](https://aistudio.google.com/) (Gemini) or
[console.groq.com](https://console.groq.com/) (Groq).

**Free-tier limits are real.** Gemini's `gemini-1.5-flash` free tier and Groq's free
tier both cap requests per minute/day. If you hit those limits during a demo, that's
the free tier — not a bug — and is the tradeoff of not running local inference.

## Known limitations (by design, for this PoC)

- **OCR accuracy on handwriting is poor.** Tesseract works well on clearly printed or
  typed documents; it was never intended to read handwritten prescriptions well, and
  this PoC doesn't attempt to work around that. The sample documents are synthetic,
  clearly printed images for this reason.
- **Even on clean, synthetic, printed text, OCR can still misread individual
  characters.** Preprocessing (`app/ocr/extract.py`) is deliberately just EXIF
  auto-rotation, grayscale + autocontrast, and modest upscaling for small/low-res
  images — hard binarization (fixed-threshold or Otsu) was tried and measurably made
  digit accuracy *worse* by breaking up anti-aliased glyph edges, and aggressive
  upscaling traded one misread for another elsewhere in testing. A targeted
  post-OCR pass corrects the specific digit/letter confusions Tesseract's LSTM
  engine produces inside dosage/lab-value numbers (e.g. "500mg" read as "5@@mg"),
  since those characters never legitimately appear there — but this is a narrow
  fix, not a guarantee against every possible misread. This is exactly why the
  extracted-fields table (Section 4.4) is editable rather than read-only.
- **Regex/spaCy extraction is best-effort**, not a medical NLP model — the editable
  extracted-fields table in the UI exists specifically so a user can correct mistakes.
- Single-user sessions only; no multi-profile/family accounts (see the PoC's non-goals).
- No production security hardening (rate limiting, WAF, etc.) — noted, not implemented.

## Architecture

```
backend/app/
  auth/         register/login, bcrypt hashing, JWT session cookie
  ocr/          PDF/image -> preprocessed image -> Tesseract
  extraction/   regex + spaCy structured field extraction
  llm/          LLMProvider abstraction (Ollama / hosted free-tier), prompts
  rag/          ChromaDB + sentence-transformers embeddings
  interactions/ static CSV-based drug interaction checker
  api/          FastAPI routes
  db/           SQLAlchemy models + session
frontend/src/
  pages/        Login, Register, Upload, Timeline, DocumentDetail, Trends, Chat
  components/   ExtractedFieldsTable, InteractionBanner, TrendChart, Layout
```
