export const CHAT_MODELS = [
  { id: "phi3", name: "Phi 3", ollama: "phi3" },
  { id: "mistral", name: "Mistral", ollama: "mistral" },
  { id: "llama3.1", name: "Llama 3.1", ollama: "llama3.1" },
] as const

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"]

export const DEFAULT_CHAT_MODEL: ChatModelId = "mistral"

const ALIASES: Record<string, ChatModelId> = {
  phi: "phi3",
  llama: "llama3.1",
}

export function normalizeChatModelId(id?: string | null): ChatModelId {
  if (!id) return DEFAULT_CHAT_MODEL
  const key = id.trim().toLowerCase()
  const resolved = (ALIASES[key] ?? key) as ChatModelId
  if (CHAT_MODELS.some((m) => m.id === resolved)) return resolved
  return DEFAULT_CHAT_MODEL
}

export function getModelDisplayName(id?: string | null): string {
  const normalized = normalizeChatModelId(id)
  return CHAT_MODELS.find((m) => m.id === normalized)?.name ?? "Mistral"
}

export function getOllamaModelName(id?: string | null): string {
  const normalized = normalizeChatModelId(id)
  return CHAT_MODELS.find((m) => m.id === normalized)?.ollama ?? "mistral"
}
