import { NextResponse } from "next/server"
import { requireAdmin, getSessionAuthHeader } from "@/lib/admin-auth"

const backendUrl = process.env.RAG_BACKEND_URL ?? "http://127.0.0.1:8000"

export async function POST() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const res = await fetch(`${backendUrl}/ingest/all`, {
      method: "POST",
      headers: await getSessionAuthHeader(),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: json?.detail ?? json?.error ?? "Reindex failed" },
        { status: res.status },
      )
    }

    return NextResponse.json(json)
  } catch (err) {
    console.error("POST /api/admin/reindex", err)
    return NextResponse.json({ error: "Reindex failed" }, { status: 500 })
  }
}
