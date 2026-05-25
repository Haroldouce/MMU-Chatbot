import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/api-auth"

const MIN_PASSWORD_LENGTH = 6

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  let body: { currentPassword?: string; newPassword?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const currentPassword = body.currentPassword?.trim()
  const newPassword = body.newPassword?.trim()

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 },
    )
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    )
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from your current password" },
      { status: 400 },
    )
  }

  if (!auth.user.email) {
    return NextResponse.json({ error: "Account email not found" }, { status: 400 })
  }

  const supabase = await createClient()

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: currentPassword,
  })

  if (verifyError) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    )
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    console.error("POST /api/profile/password", updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
