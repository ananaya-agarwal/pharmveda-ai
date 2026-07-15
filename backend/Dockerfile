FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm

COPY . .

# Persistent volume should be mounted at /data on the host platform - SQLite DB,
# ChromaDB store, and uploaded documents all need to survive redeploys.
ENV TESSERACT_CMD=/usr/bin/tesseract \
    DATABASE_URL=sqlite:////data/pharmveda.db \
    UPLOAD_DIR=/data/uploads \
    CHROMA_DIR=/data/chroma_data

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
