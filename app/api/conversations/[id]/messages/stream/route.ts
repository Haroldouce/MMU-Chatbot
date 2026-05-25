import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/api-auth"
import {
  conversationTitleFromMessage,
  fromDbRole,
  toDbRole,
} from "@/lib/chat"
import { getOllamaModelName } from "@/lib/llm-models"

const backendUrl = process.env.RAG_BACKEND_URL ?? "http://127.0.0.1:8000"

type RouteContext = { params: Promise<{ id: string }> }

async function assertConversationOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return { error: error.message, status: 500 as const }
  if (!data) return { error: "Conversation not found", status: 404 as const }
  return { conversation: data }
}

function sseLine(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser()
  if (auth instanceof Response) return auth

  const { id } = await context.params
  let body: { content?: string; n_results?: number; model?: string }

  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const content = body.content?.trim()
  if (!content) {
    return new Response(JSON.stringify({ error: "Missing content" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const supabase = await createClient()
  const ownership = await assertConversationOwner(supabase, id, auth.user.id)

  if ("error" in ownership && !("conversation" in ownership)) {
    return new Response(JSON.stringify({ error: ownership.error }), {
      status: ownership.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { conversation } = ownership

  const { data: userRow, error: userMsgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      role: toDbRole("user"),
      content,
    })
    .select("id, role, content, created_at")
    .single()

  if (userMsgError || !userRow) {
    return new Response(
      JSON.stringify({ error: userMsgError?.message ?? "Failed to save message" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  if (!conversation.title) {
    await supabase
      .from("conversations")
      .update({ title: conversationTitleFromMessage(content) })
      .eq("id", id)
      .eq("user_id", auth.user.id)
  }

  const userMessage = {
    id: userRow.id,
    role: fromDbRole(userRow.role),
    content: userRow.content,
    created_at: userRow.created_at,
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => {
        controller.enqueue(encoder.encode(sseLine(payload)))
      }

      send({ type: "user", message: userMessage })

      let fullAnswer = ""

      try {
        const backendRes = await fetch(`${backendUrl}/query/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: content,
            n_results: body.n_results ?? 3,
            model: getOllamaModelName(body.model),
          }),
        })

        if (!backendRes.ok || !backendRes.body) {
          const err = await backendRes.json().catch(() => ({}))
          send({
            type: "error",
            error: err?.detail ?? err?.error ?? "Stream failed",
          })
          controller.close()
          return
        }

        const reader = backendRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr) continue

            try {
              const event = JSON.parse(jsonStr) as {
                type: string
                content?: string
                error?: string
              }

              if (event.type === "token" && event.content) {
                fullAnswer += event.content
                send({ type: "token", content: event.content })
              } else if (event.type === "error") {
                send({ type: "error", error: event.error ?? "Stream error" })
                controller.close()
                return
              }
            } catch {
              // ignore malformed lines
            }
          }
        }

        if (!fullAnswer.trim()) {
          fullAnswer =
            "Sorry, I couldn't get an answer right now. Please try again later."
          send({ type: "token", content: fullAnswer })
        }

        const { data: assistantRow, error: assistantError } = await supabase
          .from("messages")
          .insert({
            conversation_id: id,
            role: toDbRole("assistant"),
            content: fullAnswer,
          })
          .select("id, role, content, created_at")
          .single()

        if (assistantError || !assistantRow) {
          send({
            type: "error",
            error: assistantError?.message ?? "Failed to save reply",
          })
          controller.close()
          return
        }

        send({
          type: "done",
          userMessage,
          assistantMessage: {
            id: assistantRow.id,
            role: fromDbRole(assistantRow.role),
            content: assistantRow.content,
            created_at: assistantRow.created_at,
          },
        })
      } catch (err) {
        console.error("Stream proxy error", err)
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Stream failed",
        })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
