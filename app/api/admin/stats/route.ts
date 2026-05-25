import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import fs from "fs"
import path from "path"

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { supabase } = auth

  const [usersRes, conversationsRes, messagesRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
  ])

  if (usersRes.error || conversationsRes.error || messagesRes.error) {
    console.error("GET /api/admin/stats", usersRes.error, conversationsRes.error, messagesRes.error)
    return NextResponse.json(
      { error: usersRes.error?.message ?? conversationsRes.error?.message ?? "Failed to load stats" },
      { status: 500 },
    )
  }

  let documentCount = 0
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    const files = await fs.promises.readdir(uploadsDir)
    documentCount = files.filter((f) => !f.startsWith(".")).length
  } catch {
    documentCount = 0
  }

  return NextResponse.json({
    totalUsers: usersRes.count ?? 0,
    totalConversations: conversationsRes.count ?? 0,
    totalMessages: messagesRes.count ?? 0,
    documentCount,
  })
}
