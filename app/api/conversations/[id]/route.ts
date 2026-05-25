import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/api-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params
  const supabase = await createClient()

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id)

  if (error) {
    console.error("DELETE /api/conversations/[id]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
