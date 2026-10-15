"""Intent classification and response generation for RAG queries."""

import json
from typing import Any, Generator

import ollama
from fastapi import HTTPException

from server.rag_config import collection
from server.rag_schemas import QueryResponse


ALLOWED_OLLAMA_MODELS = {
    "phi3": "phi3",
    "mistral": "mistral",
    "llama3.1": "llama3.1",
}

MODEL_ALIASES = {"phi": "phi3", "llama": "llama3.1"}


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


def classify_intent(user_input: str, model: str = "mistral") -> str:
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
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    intent = response.get("message", {}).get("content", "").strip().lower()

    # Keep routing predictable if the model returns extra text.
    if "greeting" in intent:
        return "greeting"
    if "other" in intent:
        return "other"
    return "mmu_query"


def _answer_prompt(question: str, context: str) -> str:
    return f"""
    You are a university FAQ assistant for Multimedia University (MMU).
    Answer ONLY using the provided context and do not mention the words 'provided context' or 'context'.
    If the answer is not found, say "I may not have information about that. Try again later."

    Context:
    {context}

    Question:
    {question}

    Answer:
    """


def _retrieve_context(
    question: str, n_results: int
) -> tuple[str, list[dict[str, Any]]]:
    results = collection.query(query_texts=[question], n_results=n_results)
    documents = results["documents"][0] if results["documents"] else []
    sources = results.get("metadatas", [[]])[0] if results.get("metadatas") else []
    return "\n\n".join(documents), sources


def _fixed_response(intent: str) -> str:
    if intent == "greeting":
        return "Hello! I am the MMU FAQ assistant. How can I help you today?"
    return (
        "I am specifically designed to answer questions about Multimedia "
        "University (MMU). Do you have any questions about the university?"
    )


def handle_user_message(
    question: str, n_results: int = 3, model: str = "mistral"
) -> QueryResponse:
    intent = classify_intent(question, model)
    if intent != "mmu_query":
        return QueryResponse(
            answer=_fixed_response(intent),
            context="",
            sources=[],
            metrics={"retrieval_time": 0, "generation_time": 0},
        )
    return rag_query(question, n_results, model)


def _sse_event(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _stream_text_as_tokens(text: str) -> Generator[str, None, None]:
    """Yield SSE token events for a fixed greeting or off-topic response."""
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
    if intent != "mmu_query":
        yield from _stream_text_as_tokens(_fixed_response(intent))
    else:
        context, _ = _retrieve_context(question, n_results)
        yield from _stream_ollama_tokens(_answer_prompt(question, context), model)

    yield _sse_event({"type": "done"})


def rag_query(
    question: str, n_results: int = 3, model: str = "mistral"
) -> QueryResponse:
    context, sources = _retrieve_context(question, n_results)
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": _answer_prompt(question, context)}],
    )
    answer = response.get("message", {}).get("content", "")
    return QueryResponse(
        answer=answer,
        context=context,
        sources=sources,
        metrics={"retrieval_time": 0, "generation_time": 0},
    )