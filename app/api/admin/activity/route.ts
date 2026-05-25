import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { fromDbRole } from "@/lib/chat"

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { supabase } = auth

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at, conversation_id")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("GET /api/admin/activity", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const conversationIds = [
    ...new Set((messages ?? []).map((m) => m.conversation_id)),
  ]

  let conversationMap = new Map<string, { title: string | null; user_id: string }>()
  if (conversationIds.length > 0) {
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, title, user_id")
      .in("id", conversationIds)

    conversationMap = new Map(
      (conversations ?? []).map((c) => [c.id, { title: c.title, user_id: c.user_id }]),
    )
  }

  const userIds = [...new Set([...conversationMap.values()].map((c) => c.user_id))]
  let profileMap = new Map<string, string | null>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds)

    profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]))
  }

  const activity = (messages ?? []).map((m) => {
    const conv = conversationMap.get(m.conversation_id)
    const username = conv ? profileMap.get(conv.user_id) : null
    const appRole = fromDbRole(m.role)
    const preview =
      m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content

    return {
      id: m.id,
      timestamp: m.created_at,
      event:
        appRole === "user"
          ? "User message"
          : "Assistant reply",
      details: `${username ?? "Unknown user"} · ${conv?.title ?? "Conversation"} — ${preview}`,
    }
  })

  return NextResponse.json({ activity })
}
