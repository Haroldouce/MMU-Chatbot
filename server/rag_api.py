#rag_api.py
import json
import os
import time
from typing import Any, Dict, Generator, List

import chromadb
import ollama
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse


from pydantic import BaseModel
from pypdf import PdfReader
from chromadb.utils import embedding_functions
import pymupdf4llm
from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions

from server.db import AsyncSession, get_db
from server.models import Profile, Base

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from supabase import create_client

supabase = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))



# ==========================================
# CONFIG — always use project-root my_vector_db (avoids server/ vs root split)
# ==========================================
_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SERVER_DIR)
_DEFAULT_DB = os.path.join(_PROJECT_ROOT, "my_vector_db")
UPLOADS_DIR = os.path.join(_PROJECT_ROOT, "public", "uploads")

DB_PATH = os.environ.get("RAG_DB_PATH", _DEFAULT_DB)
COLLECTION_NAME = os.environ.get("RAG_COLLECTION", "university_faq_collection")

print(f"[CONFIG] Chroma DB path: {DB_PATH}")

embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

client = chromadb.PersistentClient(path=DB_PATH)
collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_function
)

app = FastAPI(title="MMU RAG API")

# CORS: Allow all origins (actual security provided by Supabase JWT auth tokens)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_OLLAMA_MODELS = {
    "phi3": "phi3",
    "mistral": "mistral",
    "llama3.1": "llama3.1",
}

MODEL_ALIASES = {
    "phi": "phi3",
    "llama": "llama3.1",
}


def resolve_ollama_model(model: str | None) -> str:
    if not model or not str(model).strip():
        return ALLOWED_OLLAMA_MODELS["mistral"]
    key = str(model).strip().lower()
    key = MODEL_ALIASES.get(key, key)
    if key not in ALLOWED_OLLAMA_MODELS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported model. Use phi3, mistral, or llama3.1",
        )
    return ALLOWED_OLLAMA_MODELS[key]


class QueryPayload(BaseModel):
    question: str
    n_results: int = 3
    model: str = "mistral"

class QueryResponse(BaseModel):
    answer: str
    context: str
    sources: List[Dict[str, Any]]
    metrics: Dict[str, float]

class IngestPayload(BaseModel):
    pdf_paths: List[str]

class IngestFileResult(BaseModel):
    file: str
    status: str
    chunks: int = 0
    message: str | None = None


class IngestResponse(BaseModel):
    ingested: List[str]
    skipped: List[str]
    results: List[IngestFileResult] = []
    collection_count: int = 0


def clean_markdown_for_rag(text: str) -> str:
    """Remove image placeholders so embeddings focus on real text."""
    lines = []
    for line in text.splitlines():
        lower = line.lower()
        if "intentionally omitted" in lower:
            continue
        if lower.strip().startswith("**==> picture") or lower.strip().startswith("==> picture"):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def extract_text_from_pdf(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    parts: List[str] = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            parts.append(page_text)
    return "\n".join(parts)


def convert_pdf_to_markdown(pdf_path: str) -> str:
    """
    Converts a PDF document to a Markdown string, 
    preserving tables and document structure.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
    
    md_text = pymupdf4llm.to_markdown(pdf_path)
    cleaned = clean_markdown_for_rag(md_text)

    # Fallback when PDF is mostly images / placeholders
    if len(cleaned) < 500:
        fallback = extract_text_from_pdf(pdf_path)
        if len(fallback) > len(cleaned):
            print(f"[TRACE] Using pypdf fallback ({len(fallback)} chars vs {len(cleaned)} markdown)")
            return fallback

    return cleaned

    # # Initialize the converter
    # converter = DocumentConverter()
    
    # # Perform the conversion
    # result = converter.convert(pdf_path)
    
    # # Export the document as Markdown
    # markdown_content = result.document.export_to_markdown()
    
    # return markdown_content

    # pipeline_options = PdfPipelineOptions()
    # pipeline_options.do_ocr = False
    # pipeline_options.generate_page_images = False
    # pipeline_options.generate_picture_images = False
    # pipeline_options.images_scale = 1.0

    # converter = DocumentConverter(
    #     format_options={
    #         InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
    #     }
    # )
    # result = converter.convert(pdf_path)
    # return result.document.export_to_markdown()


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def ingest_pdf(pdf_path: str) -> Dict[str, Any]:
    print(f"[TRACE] ingest_pdf() called with: {pdf_path}")
    file_name = os.path.splitext(os.path.basename(pdf_path))[0]
    try:
        if not os.path.exists(pdf_path):
            return {"file": pdf_path, "status": "error", "message": "File not found", "chunks": 0}

        print(f"[TRACE] file_name = {file_name}")

        existing = collection.get(where={"source": file_name}, include=["metadatas"])
        if existing["metadatas"]:
            chunk_count = len(existing["metadatas"])
            print(f"[TRACE] SKIPPED — already {chunk_count} chunk(s) for source={file_name}")
            return {
                "file": file_name,
                "status": "skipped",
                "chunks": chunk_count,
                "message": "Already in knowledge base",
            }

        count_before = collection.count()
        print(f"[TRACE] Proceeding to ingest... collection.count() before = {count_before}")

        markdown_text = convert_pdf_to_markdown(pdf_path)
        print(f"[TRACE] Extracted {len(markdown_text)} characters of text")

        text_chunks = chunk_text(markdown_text)

        if not text_chunks:
            return {
                "file": file_name,
                "status": "empty",
                "chunks": 0,
                "message": "No text could be extracted from PDF",
            }

        ids = [f"{file_name}_{i}" for i in range(len(text_chunks))]
        metadatas = [
            {"source": file_name, "format": "markdown", "chunk_index": i}
            for i in range(len(text_chunks))
        ]

        collection.upsert(
            documents=text_chunks,
            ids=ids,
            metadatas=metadatas,
        )

        count_after = collection.count()
        print(
            f"[TRACE] Ingested {len(text_chunks)} chunks for {file_name}; "
            f"collection.count() after = {count_after}"
        )

        return {
            "file": file_name,
            "status": "ingested",
            "chunks": len(text_chunks),
            "message": f"Stored {len(text_chunks)} chunks (collection total: {count_after})",
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"file": file_name, "status": "error", "message": str(e), "chunks": 0}


def classify_intent(user_input: str, model: str = "mistral") -> str:
    prompt = f"""
    You are an intent classification assistant. 
    Analyze the usear input and classify it into exactly one of these categories:
    
    1. 'greeting': For hellos, goodbyes, and casual pleasantries.
    2. 'mmu_query': For ANY questions related to university matters, including Multimedia University (MMU), admissions, scholarships, courses, fees, campus, or studying.
    3. 'other': ONLY for completely unrelated topics (e.g., cooking, politics, coding help).

    EXAMPLES:
    1. 'greeting': "Hello!", "Hi there!", "Good morning", "Hey!", "Goodbye!", "See you later!"
    2. 'mmu_query': "What courses does MMU offer?", "How can I apply for a scholarship at Multimedia University?", "Where is MMU located?", "What are the tuition fees for MMU?", "Does MMU have a computer science program?", "List of scholarships"
    3. 'other': "What's the weather like today?", "How do I make a cake?", "Who won the football match?", "Can you help me with Python code?", "What's the capital of France?"

    Output ONLY the category name in lowercase, nothing else.
    User input: {user_input}
    """
    
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    
    intent = response.get("message", {}).get("content", "").strip().lower()
    
    # Safety check in case the LLM is verbose
    if "greeting" in intent:
        return "greeting"
    elif "other" in intent:
        return "other"
    else:
        return "mmu_query"
    

def handle_user_message(
    question: str, n_results: int = 3, model: str = "mistral"
) -> QueryResponse:
    # Step 1: Classify the intent
    intent = classify_intent(question, model)
    
    # Step 2: Route based on intent
    if intent == "greeting":
        return QueryResponse(
            answer="Hello! I am the MMU FAQ assistant. How can I help you today?",
            context="",
            sources=[],
            metrics={"retrieval_time": 0, "generation_time": 0}
        )
        
    elif intent == "other":
        return QueryResponse(
            answer="I am specifically designed to answer questions about Multimedia University (MMU). Do you have any questions about the university?",
            context="",
            sources=[],
            metrics={"retrieval_time": 0, "generation_time": 0}
        )
        
    else:
        # Step 3: Run the full RAG pipeline and pass n_results
        return rag_query(question, n_results, model)


def _sse_event(payload: Dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _stream_text_as_tokens(text: str) -> Generator[str, None, None]:
    """Yield SSE token events for a fixed string (greeting / off-topic)."""
    for word in text.split(" "):
        yield _sse_event({"type": "token", "content": word + " "})


def _stream_ollama_tokens(prompt: str, model: str) -> Generator[str, None, None]:
    stream = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for chunk in stream:
        token = chunk.get("message", {}).get("content", "") or ""
        if token:
            yield _sse_event({"type": "token", "content": token})


def stream_query_response(
    question: str, n_results: int = 3, model: str = "mistral"
) -> Generator[str, None, None]:
    intent = classify_intent(question, model)

    if intent == "greeting":
        yield from _stream_text_as_tokens(
            "Hello! I am the MMU FAQ assistant. How can I help you today?"
        )
    elif intent == "other":
        yield from _stream_text_as_tokens(
            "I am specifically designed to answer questions about Multimedia University (MMU). "
            "Do you have any questions about the university?"
        )
    else:
        results = collection.query(query_texts=[question], n_results=n_results)
        retrieved_docs = results["documents"][0] if results["documents"] else []
        context = "\n\n".join(retrieved_docs)

        prompt = f"""
                You are a university FAQ assistant for Multimedia University (MMU).
                Answer ONLY using the provided context.
                If the answer is not found, say \"I may not have information about that. Try again later.\"

                Context:
                {context}

                Question:
                {question}

                Answer:
        """
        yield from _stream_ollama_tokens(prompt, model)

    yield _sse_event({"type": "done"})


def rag_query(question: str, n_results: int = 3, model: str = "mistral") -> QueryResponse:
    results = collection.query(
        query_texts=[question],
        n_results=n_results
    )

    retrieved_docs = results["documents"][0] if results["documents"] else []
    context = "\n\n".join(retrieved_docs)
    sources = results.get("metadatas", [[]])[0] if results.get("metadatas") else []

    prompt = f"""
                You are a university FAQ assistant for Multimedia University (MMU).
                Answer ONLY using the provided context.
                If the answer is not found, say \"I may not have information about that. Try again later.\"

                Context:
                {context}

                Question:
                {question}

                Answer:
    """

    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )

    answer = response.get("message", {}).get("content", "")

    return QueryResponse(
        answer=answer,
        context=context,
        sources=sources,
        metrics={
            "retrieval_time": 0,
            "generation_time": 0,
        }
    )

async def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "db": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "details": str(e)}
    
@app.get("/user/{user_id}")
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):  # id is str (UUID)
    profile = await db.get(Profile, user_id)
    return profile

def list_indexed_sources() -> Dict[str, int]:
    """Return {source_name: chunk_count} for everything in the collection."""
    results = collection.get(include=["metadatas"])
    counts: Dict[str, int] = {}
    for meta in results.get("metadatas") or []:
        if not meta:
            continue
        source = meta.get("source", "unknown")
        counts[source] = counts.get(source, 0) + 1
    return counts


@app.get("/chunks")
def get_all_chunks():
    results = collection.get(include=["documents", "metadatas"])
    documents = results.get("documents") or []
    metadatas = results.get("metadatas") or []

    chunks = [
        {
            "index": i,
            "metadata": meta,
            "content": doc,
        }
        for i, (doc, meta) in enumerate(zip(documents, metadatas))
    ]

    return {
        "total": len(chunks),
        "sources": list_indexed_sources(),
        "db_path": DB_PATH,
        "chunks": chunks,
    }

@app.get("/ingest/status")
def ingest_status(source: str | None = None):
    """Verify chunks in the vector DB (optional filter by source metadata)."""
    if source:
        data = collection.get(where={"source": source}, include=["metadatas", "documents"])
        metas = data.get("metadatas") or []
        return {
            "source": source,
            "chunk_count": len(metas),
            "collection_count": collection.count(),
            "sources": list_indexed_sources(),
            "db_path": DB_PATH,
            "sample_preview": (data.get("documents") or [""])[0][:200] if data.get("documents") else None,
        }
    return {
        "collection_count": collection.count(),
        "sources": list_indexed_sources(),
        "db_path": DB_PATH,
    }


@app.post("/ingest/all", response_model=IngestResponse)
def api_ingest_all(user=Depends(get_current_user)):
    """Ingest every PDF in public/uploads (skips files already indexed)."""
    if not os.path.isdir(UPLOADS_DIR):
        raise HTTPException(status_code=404, detail=f"Uploads dir not found: {UPLOADS_DIR}")

    pdf_paths = [
        os.path.join(UPLOADS_DIR, name)
        for name in os.listdir(UPLOADS_DIR)
        if name.lower().endswith(".pdf")
    ]

    if not pdf_paths:
        return {
            "ingested": [],
            "skipped": [],
            "results": [],
            "collection_count": collection.count(),
        }

    payload = IngestPayload(pdf_paths=pdf_paths)
    return api_ingest(payload, user)


@app.post("/ingest", response_model=IngestResponse)
def api_ingest(payload: IngestPayload, user = Depends(get_current_user)):
    print("entered")
    ingested: List[str] = []
    skipped: List[str] = []
    results: List[IngestFileResult] = []

    for path in payload.pdf_paths:
        result = ingest_pdf(path)
        print(
            f"[TRACE] {path} → status: {result['status']}, "
            f"chunks: {result.get('chunks', 0)}, message: {result.get('message', 'N/A')}"
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
        elif result["status"] == "skipped":
            skipped.append(path)
        else:
            print(f"[ERROR] {path} failed: {result.get('message', result['status'])}")
            skipped.append(path)

    return {
        "ingested": ingested,
        "skipped": skipped,
        "results": results,
        "collection_count": collection.count(),
    }


@app.post("/query", response_model=QueryResponse)
def api_query(payload: QueryPayload):
    if not payload.question or payload.question.strip() == "":
        raise HTTPException(status_code=400, detail="question is required")
    try:
        model = resolve_ollama_model(payload.model)
        return handle_user_message(payload.question, payload.n_results, model)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print("[ERROR] /query failed:\n", tb)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query/stream")
def api_query_stream(payload: QueryPayload):
    if not payload.question or payload.question.strip() == "":
        raise HTTPException(status_code=400, detail="question is required")
    try:
        model = resolve_ollama_model(payload.model)

        def event_generator():
            try:
                yield from stream_query_response(
                    payload.question, payload.n_results, model
                )
            except Exception as e:
                import traceback
                traceback.print_exc()
                yield _sse_event({"type": "error", "error": str(e)})

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
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
