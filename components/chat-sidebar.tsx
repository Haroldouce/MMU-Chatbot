"use client"

import { Button } from "@/components/ui/button"
import { Plus, MessageSquare, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

export interface ConversationSummary {
  id: string
  title: string | null
  created_at: string
}

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  conversations: ConversationSummary[]
  historyLoading?: boolean
  disabled?: boolean
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
  selectedChatId?: string
}

export function ChatSidebar({
  isOpen,
  onClose,
  conversations,
  historyLoading,
  disabled,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  selectedChatId,
}: ChatSidebarProps) {
  const handleChatSelect = (chatId: string) => {
    if (disabled) return
    onSelectChat(chatId)
    onClose()
  }

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation()
    if (disabled) return
    onDeleteChat(chatId)
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out flex flex-col min-h-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="shrink-0 p-4 border-b border-sidebar-border flex items-center justify-between">
          <h2 className="font-semibold text-sidebar-foreground">Chat History</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="shrink-0 p-3">
          <Button
            className="w-full justify-start gap-2"
            variant="default"
            onClick={onNewChat}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3">
          <div className="space-y-1 pb-4">
            {historyLoading && (
              <p className="text-xs text-sidebar-foreground/60 px-3 py-2">Loading history…</p>
            )}
            {!historyLoading && conversations.length === 0 && (
              <p className="text-xs text-sidebar-foreground/60 px-3 py-2">
                No chats yet. Start a new conversation.
              </p>
            )}
            {conversations.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group relative flex items-start gap-2 rounded-lg px-3 py-2 transition-colors",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : cn(
                        "cursor-pointer",
                        selectedChatId === chat.id
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "hover:bg-sidebar-accent text-sidebar-foreground",
                      ),
                )}
                onClick={() => handleChatSelect(chat.id)}
                aria-disabled={disabled}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 text-sidebar-foreground/60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-sidebar-foreground truncate">
                    {chat.title ?? "New conversation"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60">
                    {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex-shrink-0"
                  onClick={(e) => handleDelete(e, chat.id)}
                  disabled={disabled}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 p-3 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 text-center">EBchat v1.0</p>
        </div>
      </aside>
    </>
  )
}
