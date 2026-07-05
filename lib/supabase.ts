// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

let supabase: ReturnType<typeof createBrowserClient> | null = null

// Only initialize if running in browser and env vars are available
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export default supabase as ReturnType<typeof createBrowserClient>