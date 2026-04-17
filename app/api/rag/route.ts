import { NextResponse } from "next/server"
import path from "path"

const backendUrl = process.env.RAG_BACKEND_URL ?? "http://127.0.0.1:8000"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Ingest route: forward file paths to backend /ingest (full filesystem path expected)
    if (body?.pdf_paths) {
      if (!Array.isArray(body.pdf_paths) || body.pdf_paths.length === 0) {
        return NextResponse.json({ error: "Missing pdf_paths" }, { status: 400 })
      }

      const resolvedPaths = body.pdf_paths.map((p: string) => {
        // if (path.isAbsolute(p)) return p
        
        // Strip leading slash and resolve to actual filesystem path
        const relative = p.replace(/^\/*/, "")
        const resolved = path.join(process.cwd(), "public", relative)
        console.log('[DEBUG] Web Path: ', p)
        console.log(`[DEBUG] Resolved path: ${resolved}`)
        return resolved
      })

      const ingestResponse = await fetch(`${backendUrl}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_paths: resolvedPaths }),
      })

      const json = await ingestResponse.json().catch(() => ({}))
      return NextResponse.json(json, { status: ingestResponse.status })
    }

    // Query route (fallback)
    if (!body?.question || typeof body.question !== "string") {
      return NextResponse.json({ error: "Missing question" }, { status: 400 })
    }

    const response = await fetch(`${backendUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: body.question, n_results: body.n_results ?? 3 }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ error: errorData.detail ?? "Backend query failed" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("API /rag error", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
