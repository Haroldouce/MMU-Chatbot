"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Send, Plus, Check } from "lucide-react"
import type { KeyboardEvent } from "react"
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  getModelDisplayName,
  type ChatModelId,
} from "@/lib/llm-models"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (value: string) => void
  selectedModel?: ChatModelId
  onModelChange?: (model: ChatModelId) => void
  disabled?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSend,
  selectedModel = DEFAULT_CHAT_MODEL,
  onModelChange,
  disabled,
}: ChatInputProps) {
  const submit = () => {
    if (disabled) return
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const currentModel = getModelDisplayName(selectedModel)

  return (
    <div className="shrink-0 border-t border-border bg-card/50 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <div className="relative rounded-xl overflow-hidden">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/40 via-accent/60 to-accent/40 animate-pulse blur-sm" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-shimmer" />

            <div
              className={`relative bg-background rounded-xl border border-accent/30 shadow-lg shadow-accent/20 ${disabled ? "opacity-60" : ""}`}
            >
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about Multimedia University..."
                disabled={disabled}
                className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-12 disabled:cursor-not-allowed"
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs flex items-center gap-1 hover:bg-accent/20"
                      disabled={disabled}
                    >
                      <span>{currentModel}</span>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2">
                    <div className="space-y-1">
                      {CHAT_MODELS.map((model) => (
                        <Button
                          key={model.id}
                          variant={selectedModel === model.id ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => onModelChange?.(model.id)}
                        >
                          {selectedModel === model.id && <Check className="h-4 w-4" />}
                          <span>{model.name}</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  size="icon"
                  type="button"
                  onClick={submit}
                  disabled={disabled || !value.trim()}
                  className="h-8 w-8 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press Enter to send, Shift + Enter for new line · Model: {currentModel}
        </p>
      </div>
    </div>
  )
}
