"use client"

export const dynamic = "force-dynamic"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  MessageSquare,
  LogOut,
  Upload,
  Trash2,
  FileText,
  Users,
  BarChart3,
  User,
  AlertCircle,
  RefreshCw,
  Mail,
  CheckCheck,
} from "lucide-react"
import supabase from "@/lib/supabase"
import {
  feedbackTypeLabel,
  type FeedbackItem,
  type FeedbackType,
} from "@/lib/feedback"
import { cn } from "@/lib/utils"

interface AdminDocument {
  id: string
  name: string
  fileName: string
  date: string
  size: string
  path: string
}

interface AdminUser {
  id: string
  username: string | null
  role: string | null
}

interface ActivityItem {
  id: string
  timestamp: string
  event: string
  details: string
}

interface AdminStats {
  totalUsers: number
  totalConversations: number
  totalMessages: number
  documentCount: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("documents")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [documents, setDocuments] = useState<AdminDocument[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [feedbackNewCount, setFeedbackNewCount] = useState(0)
  const [markingReviewedId, setMarkingReviewedId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [ingestMessage, setIngestMessage] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [statsRes, docsRes, usersRes, activityRes, feedbackRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/documents"),
        fetch("/api/admin/users"),
        fetch("/api/admin/activity"),
        fetch("/api/admin/feedback"),
      ])

      if (!statsRes.ok) {
        const body = await statsRes.json().catch(() => ({}))
        throw new Error(body?.error ?? "Failed to load stats")
      }

      const statsData = await statsRes.json()
      setStats(statsData)

      if (docsRes.ok) {
        const docsData = await docsRes.json()
        setDocuments(docsData.documents ?? [])
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users ?? [])
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setActivity(activityData.activity ?? [])
      }

      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json()
        setFeedbackItems(feedbackData.feedback ?? [])
        setFeedbackNewCount(feedbackData.newCount ?? 0)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const handleMarkReviewed = async (id: string) => {
    setMarkingReviewedId(id)
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? "Failed to update feedback")
      }
      setFeedbackItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "reviewed" } : f)),
      )
      setFeedbackNewCount((prev) => Math.max(0, prev - 1))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update feedback")
    } finally {
      setMarkingReviewedId(null)
    }
  }

  const handleDelete = async (doc: AdminDocument) => {
    if (!confirm(`Delete "${doc.name}"?`)) return
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: doc.path, name: doc.fileName }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error ?? "Delete failed")
      }
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      setStats((prev) =>
        prev ? { ...prev, documentCount: Math.max(0, prev.documentCount - 1) } : prev,
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const handleReindexAll = async () => {
    if (!confirm("Ingest all PDFs and TXT files in public/uploads into the knowledge base?")) return
    setReindexing(true)
    setIngestMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/reindex", { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error ?? json?.detail ?? "Reindex failed")
      }
      const ingested = json.ingested?.length ?? 0
      const skipped = json.skipped?.length ?? 0
      const total = json.collection_count
      setIngestMessage(
        `Reindex complete: ${ingested} ingested, ${skipped} skipped` +
          (total != null ? ` (${total} chunks total).` : "."),
      )
      await loadDashboard()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reindex failed")
    } finally {
      setReindexing(false)
    }
  }

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && !file.name.toLowerCase().endsWith(".txt")) {
      setError("Only PDF and TXT files can be ingested into the knowledge base.")
      return
    }

    setUploading(true)
    setIngestMessage(null)
    setError(null)

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, data: dataUrl }),
      })
      const uploadJson = await uploadRes.json()

      if (!uploadRes.ok || !uploadJson.ok) {
        throw new Error(uploadJson?.error ?? "Upload failed")
      }

      const ingestRes = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_paths: [uploadJson.path] }),
      })
      const ingestJson = await ingestRes.json()

      if (!ingestRes.ok) {
        throw new Error(ingestJson?.error ?? ingestJson?.detail ?? "Ingest failed")
      }

      const ingested = ingestJson.ingested?.length ?? 0
      const skipped = ingestJson.skipped?.length ?? 0
      const result = ingestJson.results?.[0]
      const chunks = result?.chunks ?? 0
      const collectionCount = ingestJson.collection_count

      if (ingested > 0 && chunks > 0) {
        setIngestMessage(
          `Ingested ${chunks} chunks into the knowledge base` +
            (collectionCount != null ? ` (${collectionCount} total in index).` : "."),
        )
      } else if (result?.status === "skipped" && chunks > 0) {
        setIngestMessage(`Already indexed (${chunks} chunks). Re-upload with a new filename to re-ingest.`)
      } else if (result?.status === "empty" || result?.status === "error") {
        throw new Error(result?.message ?? "Ingest failed — no text extracted from PDF")
      } else {
        setIngestMessage(
          skipped > 0
            ? "File already in knowledge base (skipped)."
            : "Upload complete.",
        )
      }

      await loadDashboard()
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">EBchat Admin</h1>
              <p className="text-xs text-muted-foreground">Administration Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadDashboard}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Link href="/admin/profile">
              <Button variant="outline" size="icon" aria-label="Profile">
                <User className="h-4 w-4" />
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
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {ingestMessage && (
          <Alert className="mb-6">
            <AlertDescription>{ingestMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold mt-2">
                    {loading ? "…" : (stats?.totalUsers ?? 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversations</p>
                  <p className="text-3xl font-bold mt-2">
                    {loading ? "…" : (stats?.totalConversations ?? 0)}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-3xl font-bold mt-2">
                    {loading ? "…" : (stats?.totalMessages ?? 0)}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Knowledge Documents</p>
                  <p className="text-3xl font-bold mt-2">
                    {loading ? "…" : (stats?.documentCount ?? documents.length)}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Management</CardTitle>
            <CardDescription>
              Documents, users, and platform activity
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="documents">Knowledge Documents</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="logs">Activity</TabsTrigger>
                <TabsTrigger value="feedback" className="relative">
                  Feedback
                  {feedbackNewCount > 0 && (
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                      {feedbackNewCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-4">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h3 className="font-semibold">Uploaded Documents</h3>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,application/pdf,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUpload(f)
                      }}
                    />
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleReindexAll}
                      disabled={uploading || reindexing}
                    >
                      {reindexing ? "Reindexing…" : "Reindex all Documents"}
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || reindexing}
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading…" : "Upload Document"}
                    </Button>
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Document</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Size</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No documents uploaded yet.
                          </td>
                        </tr>
                      )}
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-t border-border hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">
                            <a
                              href={doc.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {doc.name}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{doc.date}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{doc.size}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                <h3 className="font-semibold mb-4">Registered users</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Username</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">User ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No users found.
                          </td>
                        </tr>
                      )}
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-border hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">{u.username ?? "—"}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={
                                u.role === "admin"
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {u.role ?? "user"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                            {u.id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <h3 className="font-semibold mb-4">Recent activity</h3>
                <div className="space-y-3 max-h-[480px] overflow-y-auto">
                  {activity.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity yet.
                    </p>
                  )}
                  {activity.map((log) => (
                    <div
                      key={log.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-medium text-sm">{log.event}</p>
                          <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="feedback" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">User feedback & unresolved queries</h3>
                  {feedbackNewCount > 0 && (
                    <span className="text-xs font-medium text-destructive">
                      {feedbackNewCount} new
                    </span>
                  )}
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto">
                  {feedbackItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-12 border border-dashed border-border rounded-lg">
                      No feedback submitted yet.
                    </p>
                  )}
                  {feedbackItems.map((item) => {
                    const isNew = item.status === "new"
                    const isUnresolved = item.feedback_type === "unresolved_query"

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-lg border p-4 transition-colors",
                          isNew && isUnresolved
                            ? "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30"
                            : isNew
                              ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:bg-muted/50",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-semibold px-2 py-0.5 rounded-full",
                                isUnresolved
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                  : "bg-primary/15 text-primary",
                              )}
                            >
                              {feedbackTypeLabel(item.feedback_type as FeedbackType)}
                            </span>
                            {isNew && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                                New
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm mb-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a
                            href={`mailto:${item.user_email}`}
                            className="text-primary hover:underline break-all"
                          >
                            {item.user_email}
                          </a>
                        </div>

                        <p className="text-sm whitespace-pre-wrap break-words">{item.message}</p>

                        {isNew && (
                          <div className="mt-3 pt-3 border-t border-border/60">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={markingReviewedId === item.id}
                              onClick={() => handleMarkReviewed(item.id)}
                            >
                              <CheckCheck className="h-4 w-4" />
                              {markingReviewedId === item.id ? "Updating…" : "Mark as reviewed"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
