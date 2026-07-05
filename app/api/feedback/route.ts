import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/api-auth"
import type { FeedbackType } from "@/lib/feedback"

const VALID_TYPES: FeedbackType[] = ["unresolved_query", "feedback"]

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  let body: { feedback_type?: string; message?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const feedbackType = body.feedback_type as FeedbackType
  const message = body.message?.trim()

  if (!feedbackType || !VALID_TYPES.includes(feedbackType)) {
    return NextResponse.json(
      { error: "Invalid feedback type. Use unresolved_query or feedback." },
      { status: 400 },
    )
  }

  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: "Message must be at least 10 characters." },
      { status: 400 },
    )
  }

  if (!auth.user.email) {
    return NextResponse.json({ error: "Account email not found" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: auth.user.id,
      user_email: auth.user.email,
      feedback_type: feedbackType,
      message,
      status: "new",
    })
    .select("id, feedback_type, created_at")
    .single()

  if (error) {
    console.error("POST /api/feedback", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, feedback: data }, { status: 201 })
}
