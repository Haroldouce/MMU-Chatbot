import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/api-auth"
import { WELCOME_MESSAGE, toDbRole } from "@/lib/chat"

export async function GET() {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("GET /api/conversations", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversations: data ?? [] })
}

export async function POST() {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const supabase = await createClient()

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({ user_id: auth.user.id, title: null })
    .select("id, title, created_at")
    .single()

  if (convError || !conversation) {
    console.error("POST /api/conversations", convError)
    return NextResponse.json({ error: convError?.message ?? "Failed to create conversation" }, { status: 500 })
  }

  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: toDbRole("assistant"),
    content: WELCOME_MESSAGE,
  })

  if (msgError) {
    console.error("POST /api/conversations welcome message", msgError)
    await supabase.from("conversations").delete().eq("id", conversation.id)
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  return NextResponse.json({ conversation }, { status: 201 })
}
