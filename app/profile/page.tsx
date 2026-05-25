"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, ArrowLeft, LogOut, User, Mail } from "lucide-react"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import supabase from "@/lib/supabase"
import type { AccountStatus, UserProfile } from "@/lib/profile"

interface ProfileApiResponse {
  user: {
    id: string
    email: string | null
    email_confirmed_at: string | null
    last_sign_in_at: string | null
    created_at: string | null
  }
  profile: UserProfile
  accountStatus: AccountStatus
  accountStatusLabel: string
}

function statusDisplay(status: AccountStatus, label: string) {
  switch (status) {
    case "active":
      return { text: `✅ ${label}`, className: "text-green-600 dark:text-green-400" }
    default:
      return { text: `⏳ ${label}`, className: "text-amber-600 dark:text-amber-400" }
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [lastSignIn, setLastSignIn] = useState<string | null>(null)
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("pending")
  const [accountStatusLabel, setAccountStatusLabel] = useState("Loading...")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      try {
        const res = await fetch("/api/profile")
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? "Failed to load profile")
        }

        const data: ProfileApiResponse = await res.json()
        setUserEmail(data.user.email)
        setLastSignIn(data.user.last_sign_in_at)
        setJoinedAt(data.user.created_at)
        setProfile(data.profile)
        setAccountStatus(data.accountStatus)
        setAccountStatusLabel(data.accountStatusLabel)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  const status = statusDisplay(accountStatus, accountStatusLabel)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            <span className="text-xl font-bold">EBchat</span>
          </div>
          <Link href="/chat">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {profile?.username || "No username set"}
                  </CardTitle>
                  <CardDescription>
                    Role: {profile?.role || "user"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Profile Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </div>
                    <p className="text-sm">{userEmail ?? "N/A"}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Account Status
                    </div>
                    <p className={`text-sm ${status.className}`}>{status.text}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Joined
                    </div>
                    <p className="text-sm">
                      {joinedAt
                        ? new Date(joinedAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Account Settings</h3>
                <div className="space-y-3">
                  <ChangePasswordDialog />
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Email Preferences
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            variant="destructive"
            size="lg"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Last login:{" "}
            {lastSignIn ? new Date(lastSignIn).toLocaleString() : "N/A"}
          </p>
        </div>
      </main>
    </div>
  )
}
