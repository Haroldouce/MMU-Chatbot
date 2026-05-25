import { getOllamaModelName } from "@/lib/llm-models"

const backendUrl = process.env.RAG_BACKEND_URL ?? "http://127.0.0.1:8000"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body?.question || typeof body.question !== "string") {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const backendRes = await fetch(`${backendUrl}/query/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: body.question,
        n_results: body.n_results ?? 3,
        model: getOllamaModelName(body.model),
      }),
    })

    if (!backendRes.ok || !backendRes.body) {
      const err = await backendRes.json().catch(() => ({}))
      return new Response(
        JSON.stringify({ error: err?.detail ?? err?.error ?? "Stream failed" }),
        { status: backendRes.status, headers: { "Content-Type": "application/json" } },
      )
    }

    return new Response(backendRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("API /rag/stream error", error)
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
