"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, ArrowRight, AlertCircle, Lock } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate login process
    setTimeout(() => {
      // Validate admin credentials
      if (email === "admin@ebchat.com" && password === "admin123") {
        setIsLoading(false)
        router.push("/admin/dashboard")
      } else {
        setIsLoading(false)
        setError("Invalid email or password. Try admin@ebchat.com / admin123")
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <MessageSquare className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">EBchat</span>
        </div>

        {/* Admin Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Lock className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Admin Portal</span>
        </div>

        {/* Login Card */}
        <Card className="border border-border">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>Access the EBchat administration panel</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ebchat.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            {/* Back to Main Link */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary font-semibold hover:underline transition-colors">
                Back to user login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Admin Portal for EBchat Management
        </p>
      </div>
    </div>
  )
}
