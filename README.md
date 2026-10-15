# MMU FAQ Chatbot: Powered by RAG & Open-Source LLMs

An MMU FAQ chatbot with a Next.js frontend, a FastAPI RAG backend, ChromaDB
retrieval, and local Ollama models.

## Getting Started

Install the Python dependencies from the repository root (a virtual environment
is recommended):

```bash
python -m venv .venv
```

Activate the environment, then install dependencies:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Install the JavaScript dependencies:

```bash
pnpm install
```

Configure the environment variables below. The Python backend loads `.env`; the
Next.js app supports `.env.local` and other standard Next.js env files.

Start Ollama and make sure the model you select is available. Supported models
are `mistral`, `phi3`, and `llama3.1`.

Start the backend and frontend in separate terminals from the repository root:

```bash
npm run backend
```

```bash
npm run dev
```

Open `http://localhost:3000` and sign in to use the chat.

## Configuration

Required environment variables:

| Variable                        | Purpose                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                  | PostgreSQL connection string used by the backend.                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL.                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key used by the frontend and backend client. |

Optional backend settings:

| Variable          | Default                       | Purpose                                          |
| ----------------- | ----------------------------- | ------------------------------------------------ |
| `RAG_BACKEND_URL` | `http://127.0.0.1:8000`       | FastAPI base URL used by Next.js route handlers. |
| `RAG_DB_PATH`     | `<project root>/my_vector_db` | Persistent ChromaDB directory.                   |
| `RAG_COLLECTION`  | `university_faq_collection`   | ChromaDB collection name.                        |

## Backend Layout

- `server/rag_api.py` defines the FastAPI app and HTTP routes.
- `server/rag_config.py` configures ChromaDB and shared filesystem paths.
- `server/rag_schemas.py` contains request and response models.
- `server/rag_ingestion.py` extracts, chunks, and indexes PDF and TXT files.
- `server/rag_service.py` classifies questions, retrieves context, and generates responses.

The backend exposes `/health`, `/query`, `/query/stream`, `/ingest`,
`/ingest/all`, `/ingest/status`, `/chunks`, and `/user/{user_id}`. The frontend
uses Next.js API routes as a proxy; chat streaming requests are forwarded to the
backend's `/query/stream` endpoint.

## Ingestion

Place PDF or TXT files in `public/uploads`, then call the authenticated
`/ingest/all` endpoint to index all supported files. Use `/ingest/status` to
inspect the collection and indexed sources.
