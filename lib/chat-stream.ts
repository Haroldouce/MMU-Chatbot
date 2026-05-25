export type StreamEvent =
  | { type: "user"; message: StreamMessage }
  | { type: "token"; content: string }
  | { type: "done"; userMessage?: StreamMessage; assistantMessage: StreamMessage }
  | { type: "error"; error: string }

export interface StreamMessage {
  id: string
  role: "user" | "assistant"
  content: string
  created_at?: string
}

function parseSseData(line: string): StreamEvent | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith("data:")) return null
  const payload = trimmed.slice(5).trim()
  if (!payload || payload === "[DONE]") return null
  try {
    return JSON.parse(payload) as StreamEvent
  } catch {
    return null
  }
}

/** Consume an SSE response body and invoke callbacks per event. */
export async function consumeChatStream(
  response: Response,
  handlers: {
    onUser?: (message: StreamMessage) => void
    onToken?: (content: string) => void
    onDone?: (event: Extract<StreamEvent, { type: "done" }>) => void
    onError?: (error: string) => void
  },
): Promise<void> {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string })?.error ??
        (err as { detail?: string })?.detail ??
        "Stream request failed",
    )
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      dispatchEvent(line, handlers)
    }
  }

  if (buffer.trim()) {
    dispatchEvent(buffer, handlers)
  }
}

function dispatchEvent(
  line: string,
  handlers: {
    onUser?: (message: StreamMessage) => void
    onToken?: (content: string) => void
    onDone?: (event: Extract<StreamEvent, { type: "done" }>) => void
    onError?: (error: string) => void
  },
) {
  const event = parseSseData(line)
  if (!event) return

  switch (event.type) {
    case "user":
      handlers.onUser?.(event.message)
      break
    case "token":
      handlers.onToken?.(event.content)
      break
    case "done":
      handlers.onDone?.(event)
      break
    case "error":
      handlers.onError?.(event.error)
      throw new Error(event.error)
  }
}
