import { createClient } from "@/lib/supabase/client"

export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  tag_industry: string | null
  tag_deal_stage: string | null
  tag_objection: string | null
  created_by: string | null
  created_at: string
}

export async function getKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("knowledge_entries")
    .select("*")
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function saveKnowledgeEntry(entry: {
  title: string
  content: string
  tag_industry?: string
  tag_deal_stage?: string
  tag_objection?: string
}): Promise<KnowledgeEntry | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("knowledge_entries")
    .insert({ ...entry, created_by: user?.id })
    .select()
    .single()
  return data
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("knowledge_entries").delete().eq("id", id)
}

export async function getKnowledgeContext(): Promise<string> {
  const entries = await getKnowledgeEntries()
  if (entries.length === 0) return "No knowledge base entries available."

  return entries
    .map((e) => {
      const tags = [e.tag_industry, e.tag_deal_stage, e.tag_objection]
        .filter(Boolean)
        .join(", ")
      return `## ${e.title}\n${e.content}${tags ? `\nTags: ${tags}` : ""}`
    })
    .join("\n\n---\n\n")
}
