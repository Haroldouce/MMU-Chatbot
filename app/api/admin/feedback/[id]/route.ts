import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params
  let body: { status?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.status !== "reviewed") {
    return NextResponse.json({ error: "Only status reviewed is supported" }, { status: 400 })
  }

  const { supabase } = auth

  const { data, error } = await supabase
    .from("feedback")
    .update({ status: "reviewed" })
    .eq("id", id)
    .select("id, status")
    .single()

  if (error) {
    console.error("PATCH /api/admin/feedback/[id]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ feedback: data })
}
