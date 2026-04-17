"use client"

import { useState } from "react"
import Link from "next/link"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatMessages } from "@/components/chat-messages"
import { ChatInput } from "@/components/chat-input"
import { Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"


interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatConversation {
  id: string
  title: string
  messages: Message[]
}

const chatConversations: Record<string, ChatConversation> = {
  "1": {
    id: "1",
    title: "Scholarship Application Query",
    messages: [
      { id: "1", role: "assistant", content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?" },
      { id: "2", role: "user", content: "How do I apply for scholarship?" },
      { id: "3", role: "assistant", content: "To apply for a scholarship at MMU, you need to follow these steps: First, download and complete the application form from the MMU Scholarship page. Then, upload your documents via the provided google form link on the website. Finally, submit your completed application as per their instructions." },
      { id: "4", role: "user", content: "Can I apply more than one discount in MMU" },
      { id: "5", role: "assistant", content: "No, students are only entitled to one (1) MMU Scholarship at a time. They cannot combine the Scholarship with Financial Aids like Staff Discount or Sin Chew Daily Education Fund scholarship and also receive more than one discount from them simultaneously as stated in context that \"Students are not allowed to combine the Scholarship / Financial Aid.\"" }
    ]
  },
  "2": {
    id: "2",
    title: "Program Structure",
    messages: [
      { id: "1", role: "assistant", content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?" },
      { id: "2", role: "user", content: "What is the program structure for Foundation in Information Technology?" },
      { id: "3", role: "assistant", content: "Trimester 1 includes Introduction to Business Management, Introduction to Computing Technologies and Mathematics 1 along with other subjects such as Communicative English and Problem Solving. Trimester 2 consists of Critical Thinking, Introduction to Digital Systems, Multimedia Fundamentals (with Algebra and Trigonometry), Computer Applications, Introduction to Computer Architecture and Operating System. In the final trimester, students engage in Academic English, Mathematics III, Mini IT Project among other subjects such as Principles of Physics." },
    ]
  },
  "3": {
    id: "3",
    title: "Exam Schedule Query",
    messages: [
      { id: "1", role: "assistant", content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?" },
      { id: "2", role: "user", content: "Where can I find my exam schedule?" },
      { id: "3", role: "assistant", content: "You can view your exam schedule through:\n\n1. **Student Portal:** Log in and go to 'My Exams' under the Academics section\n2. **Email:** Your exam schedule will be sent to your university email 2 weeks before exams\n3. **Faculty Website:** Visit your department's page for general exam schedules\n\nExam schedules are typically released 3 weeks before the exam period begins." },
      { id: "4", role: "user", content: "Can I request to change my exam time?" },
      { id: "5", role: "assistant", content: "Exam time changes are only possible in certain circumstances:\n\n**Valid Reasons:**\n- Clash with another exam (same time)\n- Religious holiday or observance\n- Medical emergency\n- Special examination arrangements (registered with disability services)\n\nTo request a change, submit a form to the Office of Academic Affairs with supporting documentation at least 1 week before your exam. Approval is not guaranteed." },
    ]
  },
  "4": {
    id: "4",
    title: "Campus Facilities Info",
    messages: [
      { id: "1", role: "assistant", content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?" },
      { id: "2", role: "user", content: "What facilities are available on campus?" },
      { id: "3", role: "assistant", content: "Multimedia University has excellent facilities including:\n\n**Academic:**\n- State-of-the-art computer labs\n- Science laboratories\n- Design studios\n- Media production centers\n\n**Recreational:**\n- Modern gym and fitness center\n- Basketball and badminton courts\n- Swimming pool\n- Tennis courts\n\n**Student Life:**\n- Student center with cafeteria\n- Prayer rooms (multi-faith)\n- Counseling services\n- Career development office\n\nWould you like more details about any specific facility?" },
      { id: "4", role: "user", content: "How much does gym membership cost?" },
      { id: "5", role: "assistant", content: "Great news! As a Multimedia University student, you have free access to the fitness center with your student ID. Facilities include:\n\n- Cardio equipment\n- Weight training area\n- Group fitness classes\n- Swimming pool\n- Locker rooms and showers\n\nYou can register at the gym office to receive your access card. Standard hours are 6 AM to 10 PM, Monday to Sunday." },
    ]
  },
  "5": {
    id: "5",
    title: "Student Portal Access",
    messages: [
      { id: "1", role: "assistant", content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?" },
      { id: "2", role: "user", content: "I can't access the student portal. What should I do?" },
      { id: "3", role: "assistant", content: "Let's troubleshoot your student portal access:\n\n**Step 1:** Verify your credentials\n- Username: Your student ID (e.g., M20123456)\n- Password: Should be your personal password set during registration\n\n**Step 2:** Reset your password\n- Click 'Forgot Password' on the login page\n- Enter your student ID and email\n- Follow the reset link sent to your email\n\n**Step 3:** Clear browser cache\n- Try using an incognito/private browser window\n\n**Step 4:** Try a different browser\n- Chrome, Firefox, or Safari usually work best\n\nIf issues persist, contact IT support at support@mmu.edu.my" },
      { id: "4", role: "user", content: "What can I do on the student portal?" },
      { id: "5", role: "assistant", content: "The student portal allows you to:\n\n- View your academic transcript\n- Register and drop courses\n- Check exam schedules\n- View grades and exam results\n- Pay tuition fees online\n- Download official documents\n- View your class timetable\n- Access course materials\n- Communicate with instructors\n- Update your personal information\n\nIt's your one-stop hub for academic and administrative needs. Check it regularly for important announcements!" },
    ]
  },
  "6": {
    id: "6",
    title: "Tuition Fees Inquiry",
    messages: [
      { id: "1", role: "assistant", content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?" },
      { id: "2", role: "user", content: "How much is tuition for this semester?" },
      { id: "3", role: "assistant", content: "Tuition fees vary depending on your program and year level. Here are typical costs:\n\n**Engineering Programs:**\n- Year 1-2: RM 15,500 per semester\n- Year 3-4: RM 17,000 per semester\n\n**Business Programs:**\n- Year 1-2: RM 13,000 per semester\n- Year 3-4: RM 14,500 per semester\n\n**Design Programs:**\n- Year 1-2: RM 12,000 per semester\n- Year 3-4: RM 13,500 per semester\n\nThese costs include tuition, library fees, and student activity fees. For your exact amount, check the student portal or contact the Finance Office." },
      { id: "4", role: "user", content: "What are the payment options?" },
      { id: "5", role: "assistant", content: "Payment options available:\n\n1. **Online Payment:** Via student portal (Debit/Credit card)\n2. **Bank Transfer:** Direct to university's bank account\n3. **In-Person:** At the Finance Office (M-F, 9 AM - 4 PM)\n4. **Installment Plan:** Available for eligible students\n5. **Scholarship/Sponsorship:** If applicable\n\n**Payment Deadline:** Usually 2 weeks before semester starts\n\nLate payment may result in late fees. If you have financial difficulties, visit the Finance Office for assistance options including payment plans and financial aid eligibility." },
    ]
  },
  "7": {
    id: "7",
    title: "Course Registration Help",
    messages: [
      { id: "1", role: "assistant", content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?" },
      { id: "2", role: "user", content: "How do I register for courses?" },
      { id: "3", role: "assistant", content: "To register for courses at MMU, follow these steps:\n\n1. Log in to the student portal with your credentials.\n2. Navigate to the 'Course Registration' section under Academics.\n3. Select the semester you want to register for.\n4. Browse available courses and add them to your cart.\n5. Review your selected courses and ensure there are no time conflicts.\n6. Submit your registration and confirm your schedule.\n7. Pay any required fees if applicable.\n\n**Registration Period:** Usually opens 1 month before the semester starts. Check the academic calendar for specific dates." },
      { id: "4", role: "user", content: "Can I change my courses after registration?" },
      { id: "5", role: "assistant", content: "Yes, you can change your courses during the add/drop period, which typically lasts for the first 2 weeks of the semester. To make changes:\n\n1. Log in to the student portal.\n2. Go to 'Course Registration' and select 'Add/Drop Courses'.\n3. Add new courses or drop existing ones as needed.\n4. Submit your changes and confirm your updated schedule.\n\n**Important:** Ensure that you meet any prerequisites for new courses and be aware of any potential impacts on your graduation timeline or financial aid eligibility when making changes." },
    ]
  },
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState("mistral")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId)
    const conversation = chatConversations[chatId]
    if (conversation) {
      setMessages(conversation.messages)
    }
  }

  const handleNewChat = () => {
    setSelectedChatId(null)
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Hello! I'm EBchat, your Multimedia University assistant. How can I help you today?",
      },
    ])
    setInput("")
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: content, n_results: 3 }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Unable to fetch answer")
      }

      const data = await res.json()
      const answer = data?.answer ?? "I don't know."

      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: answer,
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err: any) {
      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "Sorry, I couldn't get an answer right now. Please try again later.",
      }
      setMessages((prev) => [...prev, botMessage])
      setError(err?.message ?? "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectChat={handleSelectChat}
        selectedChatId={selectedChatId || undefined}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden">
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
              <Button variant="outline" size="sm" onClick={handleNewChat}>
                New Chat
              </Button>
              <Link href="/profile">
                <Button variant="outline" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        {loading && (
          <div className="px-4 py-2 text-xs text-muted-foreground text-center">Generating answer...</div>
        )}
        {error && (
          <div className="px-4 py-2 text-xs text-destructive text-center">Error: {error}</div>
        )}
        <ChatMessages messages={messages} />

        {/* Input Area */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSendMessage}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  )
}
