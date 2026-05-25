"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ChatMessages } from "@/components/chat-messages"
import { ChatInput } from "@/components/chat-input"
import { DEFAULT_CHAT_MODEL, type ChatModelId } from "@/lib/llm-models"
import { consumeChatStream } from "@/lib/chat-stream"
import { Button } from "@/components/ui/button"
import { WELCOME_MESSAGE } from "@/lib/chat"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function ChatGuestPage() {
  const [selectedModel, setSelectedModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGE,
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isSendingRef = useRef(false)

  const handleNewChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
      },
    ])
    setInput("")
    setError(null)
  }

  const handleSendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isSendingRef.current || loading) return

    isSendingRef.current = true

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    }
    const streamAssistantId = `stream-assistant-${Date.now()}`

    setMessages((prev) => {
      const withoutWelcome =
        prev.length === 1 && prev[0].id === "welcome" ? [] : prev
      return [
        ...withoutWelcome,
        userMessage,
        { id: streamAssistantId, role: "assistant", content: "" },
      ]
    })
    setInput("")
    setError(null)
    setLoading(true)
    setStreamingMessageId(streamAssistantId)

    try {
      const res = await fetch("/api/rag/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          n_results: 3,
          model: selectedModel,
        }),
      })

      await consumeChatStream(res, {
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamAssistantId
                ? { ...m, content: m.content + token }
                : m,
            ),
          )
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamAssistantId
                ? { ...m, id: `assistant-${Date.now()}` }
                : m,
            ),
          )
        },
      })
    } catch (err: unknown) {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== streamAssistantId)
          .concat({
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            content:
              "Sorry, I couldn't get an answer right now. Please try again later.",
          }),
      )
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
      setStreamingMessageId(null)
      isSendingRef.current = false
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="font-semibold text-sm">EBchat</h1>
                <p className="text-xs text-muted-foreground">Multimedia University Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="default" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0">
          {error && (
            <div className="shrink-0 px-4 py-2 text-xs text-destructive text-center">
              Error: {error}
            </div>
          )}
          <ChatMessages
            messages={messages}
            streamingMessageId={streamingMessageId}
          />
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSendMessage}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={loading}
        />
      </div>
    </div>
  )
}
