from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    routes_auth,
    routes_chat,
    routes_documents,
    routes_interactions,
    routes_timeline,
    routes_trends,
)
from app.config import settings
from app.db.session import init_db
from app.rag.seed import seed_reference_docs


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_reference_docs()
    yield


app = FastAPI(title="PharmVeda AI PoC", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_auth.router)
app.include_router(routes_documents.router)
app.include_router(routes_timeline.router)
app.include_router(routes_trends.router)
app.include_router(routes_interactions.router)
app.include_router(routes_chat.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
