"""FastAPI application and HTTP routes for the MMU RAG backend."""

import os

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import create_client

from server.db import get_db
from server.models import Profile
from server.rag_config import DB_PATH, UPLOADS_DIR, collection
from server.rag_ingestion import ingest_file, list_indexed_sources
from server.rag_schemas import (
    IngestFileResult,
    IngestPayload,
    IngestResponse,
    QueryPayload,
    QueryResponse,
)
from server.rag_service import (
    _sse_event,
    handle_user_message,
    rag_query,
    resolve_ollama_model,
    stream_query_response,
)


supabase = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
)

app = FastAPI(title="MMU RAG API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except Exception as error:
        raise HTTPException(
            status_code=401, detail="Invalid or expired token"
        ) from error


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "db": "connected"}
    except Exception as error:
        return {"status": "unhealthy", "details": str(error)}


@app.get("/user/{user_id}")
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    return await db.get(Profile, user_id)


@app.get("/chunks")
def get_all_chunks():
    results = collection.get(include=["documents", "metadatas"])
    documents = results.get("documents") or []
    metadatas = results.get("metadatas") or []
    chunks = [
        {"index": index, "metadata": metadata, "content": document}
        for index, (document, metadata) in enumerate(zip(documents, metadatas))
    ]
    return {
        "total": len(chunks),
        "sources": list_indexed_sources(),
        "db_path": DB_PATH,
        "chunks": chunks,
    }


@app.get("/ingest/status")
def ingest_status(source: str | None = None):
    """Return collection status, optionally including one source preview."""
    if source:
        data = collection.get(
            where={"source": source}, include=["metadatas", "documents"]
        )
        metadatas = data.get("metadatas") or []
        documents = data.get("documents") or []
        return {
            "source": source,
            "chunk_count": len(metadatas),
            "collection_count": collection.count(),
            "sources": list_indexed_sources(),
            "db_path": DB_PATH,
            "sample_preview": documents[0][:200] if documents else None,
        }
    return {
        "collection_count": collection.count(),
        "sources": list_indexed_sources(),
        "db_path": DB_PATH,
    }


@app.post("/ingest/all", response_model=IngestResponse)
def api_ingest_all(user=Depends(get_current_user)):
    """Ingest every PDF or TXT in the uploads directory."""
    if not os.path.isdir(UPLOADS_DIR):
        raise HTTPException(status_code=404, detail=f"Uploads dir not found: {UPLOADS_DIR}")

    file_paths = [
        os.path.join(UPLOADS_DIR, name)
        for name in os.listdir(UPLOADS_DIR)
        if name.lower().endswith((".pdf", ".txt"))
    ]
    if not file_paths:
        return {
            "ingested": [],
            "skipped": [],
            "results": [],
            "collection_count": collection.count(),
        }

    return api_ingest(IngestPayload(file_paths=file_paths), user)


@app.post("/ingest", response_model=IngestResponse)
def api_ingest(payload: IngestPayload, user=Depends(get_current_user)):
    ingested: list[str] = []
    skipped: list[str] = []
    results: list[IngestFileResult] = []

    for path in payload.file_paths:
        result = ingest_file(path)
        print(
            f"[TRACE] {path} -> status: {result['status']}, "
            f"chunks: {result.get('chunks', 0)}, "
            f"message: {result.get('message', 'N/A')}"
        )
        results.append(
            IngestFileResult(
                file=result.get("file", path),
                status=result["status"],
                chunks=result.get("chunks", 0),
                message=result.get("message"),
            )
        )

        if result["status"] == "ingested":
            ingested.append(path)
        else:
            if result["status"] != "skipped":
                print(
                    f"[ERROR] {path} failed: "
                    f"{result.get('message', result['status'])}"
                )
            skipped.append(path)

    return {
        "ingested": ingested,
        "skipped": skipped,
        "results": results,
        "collection_count": collection.count(),
    }


@app.post("/query", response_model=QueryResponse)
def api_query(payload: QueryPayload):
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="question is required")
    try:
        model = resolve_ollama_model(payload.model)
        return handle_user_message(payload.question, payload.n_results, model)
    except Exception as error:
        import traceback

        print("[ERROR] /query failed:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/query/stream")
def api_query_stream(payload: QueryPayload):
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="question is required")
    try:
        model = resolve_ollama_model(payload.model)

        def event_generator():
            try:
                yield from stream_query_response(
                    payload.question, payload.n_results, model
                )
            except Exception as error:
                import traceback

                traceback.print_exc()
                yield _sse_event({"type": "error", "error": str(error)})

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except HTTPException:
        raise
    except Exception as error:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error)) from error