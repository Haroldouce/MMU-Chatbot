import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { supabase } = auth

  const { data, error } = await supabase
    .from("feedback")
    .select("id, user_id, user_email, feedback_type, message, status, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("GET /api/admin/feedback", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = data ?? []
  const newCount = items.filter((f) => f.status === "new").length

  return NextResponse.json({ feedback: items, newCount })
}
