"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChatSidebar, type ConversationSummary } from "@/components/chat-sidebar"
import { ChatMessages } from "@/components/chat-messages"
import { ChatInput } from "@/components/chat-input"
import { Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeedbackDialog } from "@/components/feedback-dialog"
import { WELCOME_MESSAGE } from "@/lib/chat"
import { DEFAULT_CHAT_MODEL, type ChatModelId } from "@/lib/llm-models"
import { consumeChatStream } from "@/lib/chat-stream"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

function welcomeMessages(): Message[] {
  return [
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGE,
    },
  ]
}

/** Conversations with no user message yet have title === null */
function findEmptyConversation(
  conversations: ConversationSummary[],
  selectedChatId: string | null,
): ConversationSummary | undefined {
  if (selectedChatId) {
    const selected = conversations.find((c) => c.id === selectedChatId)
    if (selected && !selected.title) return selected
  }
  return conversations.find((c) => !c.title)
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL)
  const [messages, setMessages] = useState<Message[]>(welcomeMessages())
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSendingRef = useRef(false)

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations")
    if (!res.ok) {
      throw new Error("Failed to load chat history")
    }
    const data = await res.json()
    setConversations(data.conversations ?? [])
  }, [])

  useEffect(() => {
    loadConversations()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load history")
      })
      .finally(() => setHistoryLoading(false))
  }, [loadConversations])

  const loadMessages = async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`)
    if (!res.ok) {
      throw new Error("Failed to load messages")
    }
    const data = await res.json()
    setMessages(
      (data.messages ?? []).length > 0 ? data.messages : welcomeMessages(),
    )
  }

  const handleSelectChat = async (chatId: string) => {
    if (isGenerating) return
    setSelectedChatId(chatId)
    setError(null)
    try {
      await loadMessages(chatId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    }
  }

  const openEmptyConversation = async (conversation: ConversationSummary) => {
    setSelectedChatId(conversation.id)
    setMessages(welcomeMessages())
    setInput("")
    setError(null)
    await loadMessages(conversation.id)
  }

  const handleNewChat = async () => {
    if (isGenerating) return
    setError(null)
    setIsCreatingChat(true)
    try {
      const empty = findEmptyConversation(conversations, selectedChatId)
      if (empty) {
        await openEmptyConversation(empty)
        return
      }

      const res = await fetch("/api/conversations", { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? "Failed to create conversation")
      }
      const data = await res.json()
      const conversation = data.conversation as ConversationSummary
      setConversations((prev) => [conversation, ...prev])
      await openEmptyConversation(conversation)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start new chat")
    } finally {
      setIsCreatingChat(false)
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    if (isGenerating) return
    const res = await fetch(`/api/conversations/${chatId}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err?.error ?? "Failed to delete conversation")
      return
    }
    setConversations((prev) => prev.filter((c) => c.id !== chatId))
    if (selectedChatId === chatId) {
      setSelectedChatId(null)
      setMessages(welcomeMessages())
      setInput("")
    }
  }

  const ensureConversation = async (): Promise<string> => {
    if (selectedChatId) return selectedChatId

    const empty = findEmptyConversation(conversations, null)
    if (empty) {
      setSelectedChatId(empty.id)
      return empty.id
    }

    const res = await fetch("/api/conversations", { method: "POST" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error ?? "Failed to create conversation")
    }
    const data = await res.json()
    const conversation = data.conversation as ConversationSummary
    setConversations((prev) => [conversation, ...prev])
    setSelectedChatId(conversation.id)
    return conversation.id
  }

  const handleSendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isSendingRef.current || isGenerating) return

    isSendingRef.current = true
    setError(null)
    setIsGenerating(true)
    setInput("")

    const optimisticUserId = `optimistic-user-${Date.now()}`
    const streamAssistantId = `stream-assistant-${Date.now()}`

    setMessages((prev) => {
      const withoutWelcome =
        prev.length === 1 && prev[0].id === "welcome" ? [] : prev
      return [
        ...withoutWelcome,
        { id: optimisticUserId, role: "user", content: trimmed },
        { id: streamAssistantId, role: "assistant", content: "" },
      ]
    })
    setStreamingMessageId(streamAssistantId)

    let requestConversationId: string

    try {
      requestConversationId = await ensureConversation()

      const res = await fetch(
        `/api/conversations/${requestConversationId}/messages/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed, n_results: 3, model: selectedModel }),
        },
      )

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
        onDone: (event) => {
          if (!event.userMessage) return

          const userId = event.userMessage.id
          const assistantId = event.assistantMessage.id

          setMessages((prev) => {
            const kept = prev.filter(
              (m) =>
                m.id !== optimisticUserId &&
                m.id !== streamAssistantId &&
                m.id !== userId &&
                m.id !== assistantId,
            )
            return [
              ...kept,
              {
                id: userId,
                role: "user",
                content: event.userMessage!.content,
              },
              {
                id: assistantId,
                role: "assistant",
                content: event.assistantMessage.content,
              },
            ]
          })
        },
      })

      const titleFromMessage = trimmed.slice(0, 48)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === requestConversationId && !c.title
            ? {
                ...c,
                title:
                  titleFromMessage.length <= 48
                    ? titleFromMessage
                    : `${titleFromMessage.slice(0, 48)}…`,
              }
            : c,
        ),
      )

      await loadConversations()
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.filter(
          (m) => m.id !== optimisticUserId && m.id !== streamAssistantId,
        ),
      )
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsGenerating(false)
      setStreamingMessageId(null)
      isSendingRef.current = false
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden min-h-0">
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        historyLoading={historyLoading}
        disabled={isGenerating}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        selectedChatId={selectedChatId || undefined}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="font-semibold text-sm">EBchat</h1>
                  <p className="text-xs text-muted-foreground">Multimedia University Assistant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FeedbackDialog disabled={isGenerating || isCreatingChat} />
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                disabled={isGenerating || isCreatingChat}
              >
                New Chat
              </Button>
              {isGenerating ? (
                <Button variant="outline" size="icon" disabled aria-label="Profile">
                  <User className="h-4 w-4" />
                </Button>
              ) : (
                <Link href="/profile">
                  <Button variant="outline" size="icon" aria-label="Profile">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0">
          {error && (
            <div className="shrink-0 px-4 py-2 text-xs text-destructive text-center">Error: {error}</div>
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
          disabled={isGenerating}
        />
      </div>
    </div>
  )
}
