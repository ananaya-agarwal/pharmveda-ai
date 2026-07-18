FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm

COPY . .

# /app/data is created here so the app works even with no persistent volume
# mounted (e.g. free-tier hosting) - data just won't survive a restart/redeploy
# in that case. If a persistent volume IS mounted at this same path on a paid
# tier, it transparently takes over and data does survive.
RUN mkdir -p /app/data

ENV TESSERACT_CMD=/usr/bin/tesseract \
    DATABASE_URL=sqlite:////app/data/pharmveda.db \
    UPLOAD_DIR=/app/data/uploads \
    CHROMA_DIR=/app/data/chroma_data

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
