export type AppMessageRole = "user" | "assistant"
export type DbMessageRole = "user" | "administrator"

export const WELCOME_MESSAGE =
  "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?"

export function toDbRole(role: AppMessageRole): DbMessageRole {
  return role === "assistant" ? "administrator" : "user"
}

export function fromDbRole(role: string): AppMessageRole {
  return role === "administrator" ? "assistant" : "user"
}

export function conversationTitleFromMessage(content: string): string {
  const trimmed = content.trim()
  if (trimmed.length <= 48) return trimmed
  return `${trimmed.slice(0, 48)}…`
}
