"""Pydantic request and response models for RAG endpoints."""

from typing import Any

from pydantic import BaseModel, Field


class QueryPayload(BaseModel):
    question: str
    n_results: int = 3
    model: str = "mistral"


class QueryResponse(BaseModel):
    answer: str
    context: str
    sources: list[dict[str, Any]]
    metrics: dict[str, float]


class IngestPayload(BaseModel):
    file_paths: list[str]


class IngestFileResult(BaseModel):
    file: str
    status: str
    chunks: int = 0
    message: str | None = None


class IngestResponse(BaseModel):
    ingested: list[str]
    skipped: list[str]
    results: list[IngestFileResult] = Field(default_factory=list)
    collection_count: int = 0