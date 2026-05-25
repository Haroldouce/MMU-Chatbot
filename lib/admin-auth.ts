import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { SupabaseClient, User } from "@supabase/supabase-js"

export async function getAdminProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ role: string | null } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("getAdminProfile", error)
    return null
  }

  return data
}

export async function isUserAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const profile = await getAdminProfile(supabase, userId)
  return profile?.role === "admin"
}

export async function requireAdmin(): Promise<
  { user: User; supabase: SupabaseClient } | NextResponse
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = await isUserAdmin(supabase, user.id)
  if (!admin) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 })
  }

  return { user, supabase }
}

export async function getSessionAuthHeader(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  return headers
}
