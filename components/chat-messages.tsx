"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatMessagesProps {
  messages: Message[]
  streamingMessageId?: string | null
}

export function ChatMessages({ messages, streamingMessageId }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
      <div className="max-w-3xl mx-auto space-y-6 pb-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-bold text-xs">EB</span>
              </div>
            )}
            <div
              className={cn(
                "rounded-2xl px-4 py-3 max-w-[80%]",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
                {streamingMessageId === message.id && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/60 animate-pulse align-middle" />
                )}
              </p>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-accent-foreground font-semibold text-xs">U</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
      </div>
    </div>
  )
}
