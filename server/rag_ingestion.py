"""Document extraction, chunking, and indexing for the RAG collection."""

import os
from typing import Any

import pymupdf4llm
from pypdf import PdfReader

from server.rag_config import collection


def clean_markdown_for_rag(text: str) -> str:
    """Remove image placeholders so embeddings focus on document text."""
    lines = []
    for line in text.splitlines():
        lower = line.lower()
        if "intentionally omitted" in lower:
            continue
        if lower.strip().startswith(("**==> picture", "==> picture")):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def extract_text_from_pdf(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    parts = [page_text for page in reader.pages if (page_text := page.extract_text())]
    return "\n".join(parts)


def convert_pdf_to_markdown(pdf_path: str) -> str:
    """Convert a PDF to Markdown, falling back to plain text when needed."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    markdown = clean_markdown_for_rag(pymupdf4llm.to_markdown(pdf_path))

    # Scanned or image-heavy PDFs may yield little Markdown text.
    if len(markdown) < 500:
        fallback = extract_text_from_pdf(pdf_path)
        if len(fallback) > len(markdown):
            print(
                f"[TRACE] Using pypdf fallback "
                f"({len(fallback)} chars vs {len(markdown)} markdown)"
            )
            return fallback

    return markdown


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def ingest_file(file_path: str) -> dict[str, Any]:
    print(f"[TRACE] ingest_file() called with: {file_path}")
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    extension = os.path.splitext(file_path)[1].lower()

    try:
        if not os.path.exists(file_path):
            return {
                "file": file_path,
                "status": "error",
                "message": "File not found",
                "chunks": 0,
            }

        existing = collection.get(where={"source": file_name}, include=["metadatas"])
        if existing["metadatas"]:
            chunk_count = len(existing["metadatas"])
            print(
                f"[TRACE] SKIPPED - already {chunk_count} chunk(s) "
                f"for source={file_name}"
            )
            return {
                "file": file_name,
                "status": "skipped",
                "chunks": chunk_count,
                "message": "Already in knowledge base",
            }

        if extension == ".txt":
            with open(file_path, "r", encoding="utf-8") as file:
                extracted_text = file.read()
        elif extension == ".pdf":
            extracted_text = convert_pdf_to_markdown(file_path)
        else:
            return {
                "file": file_path,
                "status": "error",
                "message": f"Unsupported file extension: {extension}",
                "chunks": 0,
            }

        print(f"[TRACE] Extracted {len(extracted_text)} characters of text")
        text_chunks = chunk_text(extracted_text)
        if not text_chunks:
            return {
                "file": file_name,
                "status": "empty",
                "chunks": 0,
                "message": "No text could be extracted from PDF",
            }

        ids = [f"{file_name}_{index}" for index in range(len(text_chunks))]
        metadatas = [
            {"source": file_name, "format": "markdown", "chunk_index": index}
            for index in range(len(text_chunks))
        ]
        collection.upsert(documents=text_chunks, ids=ids, metadatas=metadatas)

        count_after = collection.count()
        print(
            f"[TRACE] Ingested {len(text_chunks)} chunks for {file_name}; "
            f"collection.count() after = {count_after}"
        )
        return {
            "file": file_name,
            "status": "ingested",
            "chunks": len(text_chunks),
            "message": (
                f"Stored {len(text_chunks)} chunks "
                f"(collection total: {count_after})"
            ),
        }
    except Exception as error:
        import traceback

        traceback.print_exc()
        return {
            "file": file_name,
            "status": "error",
            "message": str(error),
            "chunks": 0,
        }


def list_indexed_sources() -> dict[str, int]:
    """Return each indexed source and its number of chunks."""
    results = collection.get(include=["metadatas"])
    counts: dict[str, int] = {}
    for metadata in results.get("metadatas") or []:
        if not metadata:
            continue
        source = metadata.get("source", "unknown")
        counts[source] = counts.get(source, 0) + 1
    return counts