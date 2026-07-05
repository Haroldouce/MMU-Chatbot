"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, LogOut, Mail, Shield, Clock } from "lucide-react"
import supabase from "@/lib/supabase"
import { ChangePasswordDialog } from "@/components/change-password-dialog"

interface ProfileApiResponse {
  user: {
    email: string | null
    last_sign_in_at: string | null
    created_at: string | null
  }
  profile: {
    username: string | null
    role: string | null
  }
}

export default function AdminProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [lastSignIn, setLastSignIn] = useState<string | null>(null)
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/admin/login")
        return
      }

      try {
        const res = await fetch("/api/profile")
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? "Failed to load profile")
        }

        const data: ProfileApiResponse = await res.json()

        if (data.profile.role !== "admin") {
          router.push("/admin/login?error=forbidden")
          return
        }

        setEmail(data.user.email)
        setUsername(data.profile.username)
        setRole(data.profile.role)
        setLastSignIn(data.user.last_sign_in_at)
        setJoinedAt(data.user.created_at)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">EBchat Admin</h1>
              <p className="text-xs text-muted-foreground">Administration Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
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
                  <Shield className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{username ?? "Administrator"}</CardTitle>
                  <CardDescription>EBchat Admin Account</CardDescription>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Account Information</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </div>
                    <p className="text-sm">{email ?? "—"}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      Role
                    </div>
                    <p className="text-sm capitalize">{role ?? "admin"}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Last Login
                    </div>
                    <p className="text-sm">
                      {lastSignIn ? new Date(lastSignIn).toLocaleString() : "—"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Account Status</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <p className="text-sm">Active</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Account Settings</h3>
                <ChangePasswordDialog />
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
            Admin account
            {joinedAt ? ` • Joined ${new Date(joinedAt).toLocaleDateString()}` : ""}
          </p>
        </div>
      </main>
    </div>
  )
}
