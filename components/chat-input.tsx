"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Send, Plus, Check } from "lucide-react"
import type { KeyboardEvent } from "react"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (value: string) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
}

const AVAILABLE_MODELS = [
  { id: "mistral", name: "Mistral 7B" },
  { id: "phi", name: "Phi 3.8b" },
  { id: "llama", name: "LlaMa 3.1" },
]

export function ChatInput({ value, onChange, onSend, selectedModel = "mistral", onModelChange }: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend(value)
    }
  }

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || "Mistral 7B"

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          {/* Glowing effect container */}
          <div className="relative rounded-xl overflow-hidden">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/40 via-accent/60 to-accent/40 animate-pulse blur-sm" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-shimmer" />

            {/* Input container */}
            <div className="relative bg-background rounded-xl border border-accent/30 shadow-lg shadow-accent/20">
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about Multimedia University..."
                className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-12"
              />

              {/* Right side controls */}
              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                {/* Model Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs flex items-center gap-1 hover:bg-accent/20"
                    >
                      <span>{currentModel}</span>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2">
                    <div className="space-y-1">
                      {AVAILABLE_MODELS.map((model) => (
                        <Button
                          key={model.id}
                          variant={selectedModel === model.id ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => {
                            onModelChange?.(model.id)
                          }}
                        >
                          {selectedModel === model.id && <Check className="h-4 w-4" />}
                          <span>{model.name}</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Send Button */}
                <Button
                  size="icon"
                  onClick={() => onSend(value)}
                  disabled={!value.trim()}
                  className="h-8 w-8 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
