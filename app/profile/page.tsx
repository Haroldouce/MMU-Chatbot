"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, ArrowLeft, LogOut, User, Mail, Calendar } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()

  const handleLogout = () => {
    // Simulate logout process
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
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

      {/* Profile Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Test</CardTitle>
                  <CardDescription>Student ID: M20123456</CardDescription>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6 space-y-6">
              {/* Profile Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Profile Information</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Email */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </div>
                    <p className="text-sm">test@gmail.com</p>
                  </div>

                  {/* Program */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Program</div>
                    <p className="text-sm">Bachelor of Science in Computer Science</p>
                  </div>

                  {/* Year of Study */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Year of Study
                    </div>
                    <p className="text-sm">Third Year (Year 3)</p>
                  </div>

                  {/* Faculty */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Faculty</div>
                    <p className="text-sm">Faculty of Computing and Informatics</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quick Stats */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Account Statistics</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-secondary/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">23</p>
                        <p className="text-sm text-muted-foreground">Chat Conversations</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">127</p>
                        <p className="text-sm text-muted-foreground">Questions Asked</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">15 min</p>
                        <p className="text-sm text-muted-foreground">Avg. Response Time</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Account Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Account Settings</h3>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Email Preferences
                  </Button>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Privacy Settings
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
            Last login: Today at 2:30 PM
          </p>
        </div>
      </main>
    </div>
  )
}
