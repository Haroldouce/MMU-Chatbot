import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { supabase } = auth

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role")
    .order("username", { ascending: true })

  if (error) {
    console.error("GET /api/admin/users", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data ?? [] })
}
