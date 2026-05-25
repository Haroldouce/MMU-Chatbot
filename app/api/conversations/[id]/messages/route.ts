import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/api-auth"
import {
  conversationTitleFromMessage,
  fromDbRole,
  toDbRole,
} from "@/lib/chat"
import { getOllamaModelName } from "@/lib/llm-models"

const backendUrl = process.env.RAG_BACKEND_URL ?? "http://127.0.0.1:8000"

type RouteContext = { params: Promise<{ id: string }> }

async function assertConversationOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return { error: error.message, status: 500 as const }
  if (!data) return { error: "Conversation not found", status: 404 as const }
  return { conversation: data }
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params
  const supabase = await createClient()

  const ownership = await assertConversationOwner(supabase, id, auth.user.id)
  if ("error" in ownership && !("conversation" in ownership)) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status })
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("GET /api/conversations/[id]/messages", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const messages = (data ?? []).map((row) => ({
    id: row.id,
    role: fromDbRole(row.role),
    content: row.content,
    created_at: row.created_at,
  }))

  return NextResponse.json({ messages })
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params
  let body: { content?: string; n_results?: number; model?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const content = body.content?.trim()
  if (!content) {
    return NextResponse.json({ error: "Missing content" }, { status: 400 })
  }

  const supabase = await createClient()
  const ownership = await assertConversationOwner(supabase, id, auth.user.id)

  if ("error" in ownership && !("conversation" in ownership)) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status })
  }

  const { conversation } = ownership

  const { data: userRow, error: userMsgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      role: toDbRole("user"),
      content,
    })
    .select("id, role, content, created_at")
    .single()

  if (userMsgError || !userRow) {
    console.error("POST user message", userMsgError)
    return NextResponse.json({ error: userMsgError?.message ?? "Failed to save message" }, { status: 500 })
  }

  if (!conversation.title) {
    await supabase
      .from("conversations")
      .update({ title: conversationTitleFromMessage(content) })
      .eq("id", id)
      .eq("user_id", auth.user.id)
  }

  let answer =
    "Sorry, I couldn't get an answer right now. Please try again later."

  try {
    const response = await fetch(`${backendUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: content,
        n_results: body.n_results ?? 3,
        model: getOllamaModelName(body.model),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      answer = data?.answer ?? "I don't know."
    }
  } catch (err) {
    console.error("RAG query failed", err)
  }

  const { data: assistantRow, error: assistantError } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      role: toDbRole("assistant"),
      content: answer,
    })
    .select("id, role, content, created_at")
    .single()

  if (assistantError || !assistantRow) {
    console.error("POST assistant message", assistantError)
    return NextResponse.json({ error: assistantError?.message ?? "Failed to save reply" }, { status: 500 })
  }

  return NextResponse.json({
    userMessage: {
      id: userRow.id,
      role: fromDbRole(userRow.role),
      content: userRow.content,
      created_at: userRow.created_at,
    },
    assistantMessage: {
      id: assistantRow.id,
      role: fromDbRole(assistantRow.role),
      content: assistantRow.content,
      created_at: assistantRow.created_at,
    },
  })
}
