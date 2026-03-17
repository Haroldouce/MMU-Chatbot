"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, LogOut, Upload, Trash2, FileText, Settings, Users, BarChart3, User } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("documents")

  const handleLogout = () => {
    router.push("/admin/login")
  }

  const [documents, setDocuments] = useState([
    { id: 1, name: "CampusGuide.pdf", date: "2025-01-15", size: "2.4 MB", path: "/uploads/CampusGuide.pdf" },
    { id: 2, name: "ExamRules.docx", date: "2025-01-18", size: "1.2 MB", path: "/uploads/ExamRules.docx" },
    { id: 3, name: "StudentHandbook.pdf", date: "2025-01-10", size: "3.8 MB", path: "/uploads/StudentHandbook.pdf" },
  ])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const handleDelete = async (docId: number, docPath?: string) => {
    if (!confirm('Delete this document?')) return
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: docPath, name: undefined }),
      })
      const json = await res.json()
      if (json.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId))
      } else {
        console.error('Delete failed', json)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const systemLogs = [
    { id: 1, timestamp: "2025-01-23 14:30:45", event: "User login", details: "test@gmail.com logged in" },
    { id: 2, timestamp: "2025-01-23 14:15:30", event: "Chat created", details: "New conversation started" },
    { id: 3, timestamp: "2025-01-23 13:45:12", event: "Document uploaded", details: "ExamRules.docx uploaded" },
    { id: 4, timestamp: "2025-01-23 12:20:00", event: "Model switched", details: "User switched to Phi 3.8b" },
  ]

  const feedback = [
    { id: 1, user: "test@gmail.com", rating: 5, message: "Great chatbot! Very helpful." },
    { id: 2, user: "student@gmail.com", rating: 4, message: "Good responses, could be faster." },
    { id: 3, user: "admin@test.com", rating: 5, message: "Excellent service for students." },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <Link href="/admin/profile">
              <Button variant="outline" size="icon">
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold mt-2">1,234</p>
                </div>
                <Users className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Chats</p>
                  <p className="text-3xl font-bold mt-2">5,678</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-3xl font-bold mt-2">4.8/5</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">FAQ Docs</p>
                  <p className="text-3xl font-bold mt-2">{documents.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Management</CardTitle>
            <CardDescription>Manage documents, logs, and user feedback</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="documents">FAQ Documents</TabsTrigger>
                <TabsTrigger value="logs">System Logs</TabsTrigger>
                <TabsTrigger value="feedback">User Feedback</TabsTrigger>
              </TabsList>

              {/* FAQ Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Uploaded Documents</h3>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="*/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0] ?? null
                        setSelectedFile(f)
                        if (f) {
                          // auto-upload
                          setUploading(true)
                          try {
                            const reader = new FileReader()
                            reader.readAsDataURL(f)
                            reader.onload = async () => {
                              const dataUrl = reader.result as string
                              const res = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: f.name, data: dataUrl }),
                              })
                              const json = await res.json()
                              if (json.ok) {
                                const newDoc = {
                                  id: Date.now(),
                                  name: f.name,
                                  date: new Date().toISOString().slice(0, 10),
                                  size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
                                  path: json.path,
                                }
                                setDocuments((prev) => [newDoc, ...prev])
                                setSelectedFile(null)
                                if (fileInputRef.current) fileInputRef.current.value = ''
                              } else {
                                console.error('Upload failed', json)
                              }
                              setUploading(false)
                            }
                          } catch (err) {
                            console.error(err)
                            setUploading(false)
                          }
                        }
                      }}
                    />

                    <Button
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                    {selectedFile ? <span className="text-sm text-muted-foreground">{selectedFile.name}</span> : null}
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Document Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Size</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-t border-border hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">{doc.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{doc.date}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{doc.size}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id, doc.path)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* System Logs Tab */}
              <TabsContent value="logs" className="space-y-4">
                <h3 className="font-semibold mb-4">Recent System Logs</h3>

                <div className="space-y-3">
                  {systemLogs.map((log) => (
                    <div key={log.id} className="border border-border rounded-lg p-4 hover:bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{log.event}</p>
                          <p className="text-xs text-muted-foreground">{log.details}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* User Feedback Tab */}
              <TabsContent value="feedback" className="space-y-4">
                <h3 className="font-semibold mb-4">User Feedback</h3>

                <div className="space-y-3">
                  {feedback.map((item) => (
                    <div key={item.id} className="border border-border rounded-lg p-4 hover:bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{item.user}</p>
                          <div className="flex items-center gap-1 my-2">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-lg ${i < item.rating ? "text-yellow-400" : "text-muted-foreground"}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
