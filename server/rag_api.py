#rag_api.py
import os
import time
from typing import Any, Dict, List

import chromadb
import ollama
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware


from pydantic import BaseModel
from pypdf import PdfReader
from chromadb.utils import embedding_functions
import pymupdf4llm
from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions

from db import AsyncSession, get_db
from models import Profile, Base

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from supabase import create_client

supabase = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))



# ==========================================
# CONFIG
# ==========================================
DB_PATH = os.environ.get("RAG_DB_PATH", "./my_vector_db")
COLLECTION_NAME = os.environ.get("RAG_COLLECTION", "university_faq_collection")

embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

client = chromadb.PersistentClient(path=DB_PATH)
collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_function
)

app = FastAPI(title="MMU RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryPayload(BaseModel):
    question: str
    n_results: int = 3

class QueryResponse(BaseModel):
    answer: str
    context: str
    sources: List[Dict[str, Any]]
    metrics: Dict[str, float]

class IngestPayload(BaseModel):
    pdf_paths: List[str]

class IngestResponse(BaseModel):
    ingested: List[str]
    skipped: List[str]


def convert_pdf_to_markdown(pdf_path: str) -> str:
    """
    Converts a PDF document to a Markdown string, 
    preserving tables and document structure.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
    
    md_text = pymupdf4llm.to_markdown(pdf_path)
    return md_text

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


# def extract_text_from_pdf(pdf_path: str) -> str:
#     reader = PdfReader(pdf_path)
#     text = ""
#     for page in reader.pages:
#         page_text = page.extract_text()
#         if page_text:
#             text += page_text + "\n"
#     return text


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
    try:
        if not os.path.exists(pdf_path):
            return {"file": pdf_path, "status": "error", "message": "File not found"}

        file_name = os.path.splitext(os.path.basename(pdf_path))[0]
        print(f"[TRACE] file_name = {file_name}")
        
        # Check if already exists to avoid duplicates
        # Use metadata-filtered `get` for reliable dedupe.
        existing = collection.get(where={"source": file_name}, include=["metadatas"])
        if existing["metadatas"]:  # Non-empty list means records exist
            print("[TRACE] Returning SKIPPED here")
            return {"file": file_name, "status": "skipped"}

        print("[TRACE] Proceeding to ingest...")
        
        print(f"[DEBUG] collection.count() = {collection.count()}")
        print(f"[DEBUG] existing = {existing}")
        print(f"[DEBUG] existing['metadatas'] = {existing['metadatas']}")

        # Extract / convert and chunk
        # pdf_text = extract_text_from_pdf(pdf_path)
        # text_chunks = chunk_text(pdf_text)

        # 1. Convert to Markdown instead of plain text
        markdown_text = convert_pdf_to_markdown(pdf_path)
    
        # 2. Chunk the Markdown 
        text_chunks = chunk_text(markdown_text)

        if not text_chunks:
            return {"file": file_name, "status": "empty"}

        ids = [f"{file_name}_{i}" for i in range(len(text_chunks))]
        # metadatas = [{"source": file_name, "chunk_index": i} for i in range(len(text_chunks))]
        metadatas = [{"source": file_name, "format": "markdown"} for _ in text_chunks]

        collection.upsert(
            documents=text_chunks,
            ids=ids,
            metadatas=metadatas,
        )

        return {"file": file_name, "status": "ingested", "chunks": len(text_chunks)}
    
    except Exception as e:
        return {"file": file_name, "status": "error", "message": str(e)}


def classify_intent(user_input: str) -> str:
    prompt = f"""
    You are an intent classification assistant. 
    Analyze the user input and classify it into exactly one of these categories:
    
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
        model="phi3",
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
    

def handle_user_message(question: str, n_results: int = 3) -> QueryResponse:
    # Step 1: Classify the intent
    intent = classify_intent(question)
    
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
        return rag_query(question, n_results)


def rag_query(question: str, n_results: int = 3) -> QueryResponse:
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
        model="phi3",
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

@app.get("/chunks")
def get_all_chunks():
    results = collection.get(include=["documents", "metadatas"])
    
    chunks = [
        {
            "index": i,
            "metadata": meta,
            "content": doc
        }
        for i, (doc, meta) in enumerate(zip(results["documents"], results["metadatas"]))
    ]
    
    return {
        "total": len(chunks),
        "chunks": chunks
    }

@app.post("/ingest", response_model=IngestResponse)
def api_ingest(payload: IngestPayload, user = Depends(get_current_user)):
    print("entered")
    ingested = []
    skipped = []

    for path in payload.pdf_paths:
        result = ingest_pdf(path)
        print(f"[TRACE] {path} → status: {result['status']}, message: {result.get('message', 'N/A')}")

        if result["status"] == "ingested":
            ingested.append(path)
        elif result["status"] == "skipped":
            skipped.append(path)
        else:
            # "error" or "empty" — print the actual reason
            print(f"[ERROR] {path} failed: {result.get('message', result['status'])}")
            skipped.append(path)  # or handle separately

    return {"ingested": ingested, "skipped": skipped}


@app.post("/query", response_model=QueryResponse)
def api_query(payload: QueryPayload):
    if not payload.question or payload.question.strip() == "":
        raise HTTPException(status_code=400, detail="question is required")
    try:
        # return rag_query(payload.question, payload.n_results)
        return handle_user_message(payload.question, payload.n_results)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print("[ERROR] /query failed:\n", tb)
        raise HTTPException(status_code=500, detail=str(e))
