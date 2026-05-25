import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

export async function requireUser(): Promise<{ user: User } | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return { user }
}
