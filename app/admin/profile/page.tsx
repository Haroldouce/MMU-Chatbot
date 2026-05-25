"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, LogOut, User, Mail, Shield } from "lucide-react"
import supabase from "@/lib/supabase"

export default function AdminProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setEmail(data.user?.email ?? null)
          setUsername(data.profile?.username ?? null)
        }
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
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

      {/* Profile Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
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
              {/* Admin Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Account Information</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Email */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </div>
                    <p className="text-sm">{email ?? "—"}</p>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      Role
                    </div>
                    <p className="text-sm">System Administrator</p>
                  </div>

                  {/* Login Date */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Last Login
                    </div>
                    <p className="text-sm">Today at 2:45 PM</p>
                  </div>

                  {/* Account Status */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Account Status</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-sm">Active</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Admin Stats */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Admin Statistics</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-secondary/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">156</p>
                        <p className="text-sm text-muted-foreground">Documents Managed</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">1,234</p>
                        <p className="text-sm text-muted-foreground">Active Users</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">247</p>
                        <p className="text-sm text-muted-foreground">System Logs</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Admin Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Admin Settings</h3>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    System Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Audit Logs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout Button */}
          <div className="flex gap-3">
            <Button
              variant="destructive"
              size="lg"
              className="w-full gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* Footer Info */}
          <p className="text-center text-xs text-muted-foreground">
            System Administrator Account • Created: 2025-01-01
          </p>
        </div>
      </main>
    </div>
  )
}
