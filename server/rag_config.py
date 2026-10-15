"""Shared configuration and ChromaDB collection setup for the RAG backend."""

import os

import chromadb
from chromadb.utils import embedding_functions


SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVER_DIR)
DEFAULT_DB_PATH = os.path.join(PROJECT_ROOT, "my_vector_db")
UPLOADS_DIR = os.path.join(PROJECT_ROOT, "public", "uploads")

DB_PATH = os.environ.get("RAG_DB_PATH", DEFAULT_DB_PATH)
COLLECTION_NAME = os.environ.get("RAG_COLLECTION", "university_faq_collection")

print(f"[CONFIG] Chroma DB path: {DB_PATH}")

embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)
client = chromadb.PersistentClient(path=DB_PATH)
collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_function,
)