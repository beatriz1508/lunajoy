import { createClient } from "@/lib/supabase/client"

export interface HistoryEntry {
  id: string
  user_id: string
  type: "copilot" | "brainstorm" | "training"
  title: string
  summary: string
  full_content: string
  score: number | null
  xp_earned: number | null
  created_at: string
}

export async function getHistoryEntries(): Promise<HistoryEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("history_entries")
    .select("*")
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function saveHistoryEntry(entry: {
  type: "copilot" | "brainstorm" | "training"
  title: string
  summary: string
  full_content: string
  score?: number
  xp_earned?: number
}): Promise<HistoryEntry | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("history_entries")
    .insert({ ...entry, user_id: user.id })
    .select()
    .single()
  return data
}
