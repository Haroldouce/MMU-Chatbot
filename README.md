# FAQ Chatbot

## RAG Backend + Next.js Integration

1. Install Python dependencies (recommended in a virtualenv):

```bash
pip install requirements.txt
```

2. Populate `server/rag_api.py` paths and API keys:
   - `DB_PATH` and `COLLECTION_NAME` are set in file and env vars.
   - `ollama` should be configured based on your local installation (e.g. `ollama` daemon running).

3. Start Python backend:

```bash
npm run backend
```

4. Start Next.js frontend:

```bash
npm run dev
```

5. Open `http://localhost:3000/chat` and ask questions.

### Notes

- The frontend now talks to `/api/rag` and forwards to `http://127.0.0.1:8000/query`.
- If your Python service is on different host/port, set `RAG_BACKEND_URL` in your env before running Next.js.
- The backend includes `/ingest` (POST) and a `/health` endpoint.
