import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/api-auth"
import {
  defaultUsername,
  resolveAccountStatus,
  type UserProfile,
} from "@/lib/profile"

export async function GET() {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const supabase = await createClient()
  const { user } = auth

  const { data: profileRow, error } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    // role column may not exist yet — fall back to id + username only
    const { data: fallback, error: fallbackError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", user.id)
      .maybeSingle()

    if (fallbackError) {
      console.error("GET /api/profile", fallbackError)
      return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    }

    return buildProfileResponse(user, fallback as UserProfile | null)
  }

  return buildProfileResponse(user, profileRow as UserProfile | null)
}

function buildProfileResponse(
  user: {
    id: string
    email?: string | null
    email_confirmed_at?: string | null
    last_sign_in_at?: string | null
    created_at?: string
    user_metadata?: Record<string, unknown>
  },
  profileRow: UserProfile | null,
) {
  const username = defaultUsername(
    user.id,
    user.email,
    user.user_metadata?.username as string | undefined,
  )

  const profile: UserProfile = profileRow ?? {
    id: user.id,
    username,
    role: "user",
  }

  const account = resolveAccountStatus(user.email_confirmed_at)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      created_at: user.created_at,
    },
    profile: {
      id: profile.id,
      username: profile.username ?? username,
      role: profile.role ?? "user",
    },
    accountStatus: account.status,
    accountStatusLabel: account.label,
  })
}
