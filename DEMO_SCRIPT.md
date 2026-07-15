# DEMO_SCRIPT.md — 5-Minute Walkthrough

Prerequisites: backend running (`uvicorn app.main:app --reload`), frontend running
(`npm run dev`), Ollama running with a model pulled, and synthetic sample documents
generated (`python scripts/generate_sample_documents.py`).

## 1. Register and log in (30s)

- Go to `http://localhost:5173/register`, create an account.
- You're redirected to the (empty) timeline.

## 2. Upload the first lab report → see extraction (60s)

- Go to **Upload**, select `backend/seed_data/sample_documents/sample_lab_report_1.png`.
- You're taken to the document detail page. Point out:
  - The **editable extracted-fields table** (Hemoglobin, HbA1c, Creatinine, Fasting
    Glucose, LDL Cholesterol) — mention this is regex + spaCy, not a trained medical
    NLP model, which is why it's editable.
  - Click **"Show raw OCR text"** to show what Tesseract actually read from the image.

## 3. Get the plain-language explanation (45s)

- Click **"Explain in plain language"**.
- The LLM (local Ollama) explains the lab values in plain language, framed as "often
  associated with" rather than diagnostic language, ending with a disclaimer to
  discuss with a doctor.

## 4. Upload a second lab report with an overlapping metric → see trend chart (45s)

- Upload `sample_lab_report_2.png` (dated ~3 months later, same metrics).
- Go to **Trends** — since HbA1c, Hemoglobin, Creatinine, etc. now each appear in 2+
  documents, each gets its own line chart showing the change over time.

## 5. Ask a RAG-grounded question (45s)

- Go to **Ask a question**, ask: *"What does high creatinine mean?"*
- The answer is grounded in the curated reference text (`seed_data/reference_docs/creatinine.md`)
  plus the user's own extracted data, and ends with the safety disclaimer.

## 6. Upload prescriptions with a known interaction → see the flag (45s)

- Upload `sample_prescription_1.png`, then `sample_prescription_2.png` (adds Warfarin
  + Aspirin to the user's active medicines).
- Go back to **Timeline** or any document page — the **interaction warning banner**
  appears: "Possible interaction: Warfarin + Aspirin (severe) — combining increases
  bleeding risk... discuss with your doctor."

## Wrap-up talking points

- Everything ran on free/local tools: Tesseract OCR, regex/spaCy extraction, a local
  Ollama model, ChromaDB + sentence-transformers for RAG — zero paid API calls.
- OCR/extraction mistakes are expected and correctable in the UI — that's a deliberate
  design choice, not an oversight.
- Every explanation is non-diagnostic and disclaimed by design (see the system prompts
  in `backend/app/llm/prompts.py`).
