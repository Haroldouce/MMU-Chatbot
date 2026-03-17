"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MessageSquare, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectChat: (chatId: string) => void
  selectedChatId?: string
}

export function ChatSidebar({ isOpen, onClose, onSelectChat, selectedChatId }: ChatSidebarProps) {
  const chatHistory = [
    // { id: "1", title: "Course Registration Help", date: "Today" },
    // { id: "2", title: "Library Hours Question", date: "Today" },
    // { id: "3", title: "Exam Schedule Query", date: "Yesterday" },
    // { id: "4", title: "Campus Facilities Info", date: "Yesterday" },
    // { id: "5", title: "Student Portal Access", date: "2 days ago" },
    // { id: "6", title: "Tuition Fees Inquiry", date: "3 days ago" },
    { id: "1", title: "Scholarship Information", date: "Today" },
    { id: "2", title: "Course Registration Help", date: "16 days ago" },
    { id: "3", title: "Library Hours Question", date: "16 days ago" },
    { id: "4", title: "Exam Schedule Query", date: "17 days ago" },
    { id: "5", title: "Campus Facilities Info", date: "17 days ago" },
    { id: "6", title: "Student Portal Access", date: "18 days ago" },
    { id: "7", title: "Tuition Fees Inquiry", date: "19 days ago" },
  ]

  const handleChatSelect = (chatId: string) => {
    onSelectChat(chatId)
    onClose()
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <h2 className="font-semibold text-sidebar-foreground">Chat History</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button className="w-full justify-start gap-2" variant="default">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Chat History List */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group relative flex items-start gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                  selectedChatId === chat.id
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                )}
                onClick={() => handleChatSelect(chat.id)}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 text-sidebar-foreground/60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-sidebar-foreground truncate">{chat.title}</p>
                  <p className="text-xs text-sidebar-foreground/60">{chat.date}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex-shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 text-center">EBchat v1.0</p>
        </div>
      </aside>
    </>
  )
}
