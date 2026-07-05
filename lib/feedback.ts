export type FeedbackType = "unresolved_query" | "feedback"

export type FeedbackStatus = "new" | "reviewed"

export const FEEDBACK_TYPE_OPTIONS: {
  value: FeedbackType
  label: string
  description: string
}[] = [
  {
    value: "unresolved_query",
    label: "Unresolved Queries",
    description: "Report a question the assistant could not answer properly.",
  },
  {
    value: "feedback",
    label: "Feedbacks",
    description: "Share suggestions or general feedback about EBchat.",
  },
]

export function feedbackTypeLabel(type: FeedbackType): string {
  return FEEDBACK_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

export interface FeedbackItem {
  id: string
  user_id: string | null
  user_email: string
  feedback_type: FeedbackType
  message: string
  status: FeedbackStatus
  created_at: string
}
