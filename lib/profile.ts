export interface UserProfile {
  id: string
  username: string | null
  role?: string | null
}

export type AccountStatus = "active" | "pending"

export function resolveAccountStatus(emailConfirmedAt?: string | null): {
  status: AccountStatus
  label: string
} {
  if (!emailConfirmedAt) {
    return { status: "pending", label: "Pending email verification" }
  }
  return { status: "active", label: "Active" }
}

export function defaultUsername(
  userId: string,
  email?: string | null,
  metadataUsername?: string | null,
): string {
  if (metadataUsername?.trim()) return metadataUsername.trim()
  if (email?.includes("@")) return email.split("@")[0]
  return `user_${userId.slice(0, 8)}`
}
