import { getItem, setItem } from "./storage"

export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  tags: {
    industry?: string
    dealStage?: string
    objectionType?: string
  }
  createdAt: string
}

const KNOWLEDGE_KEY = "knowledge_base"

export function getKnowledgeEntries(): KnowledgeEntry[] {
  return getItem<KnowledgeEntry[]>(KNOWLEDGE_KEY, [])
}

export function saveKnowledgeEntry(
  entry: Omit<KnowledgeEntry, "id" | "createdAt">
): KnowledgeEntry {
  const entries = getKnowledgeEntries()
  const newEntry: KnowledgeEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  setItem(KNOWLEDGE_KEY, [...entries, newEntry])
  return newEntry
}

export function deleteKnowledgeEntry(id: string): void {
  const entries = getKnowledgeEntries().filter((e) => e.id !== id)
  setItem(KNOWLEDGE_KEY, entries)
}

export function getKnowledgeContext(): string {
  const entries = getKnowledgeEntries()
  if (entries.length === 0) return "No knowledge base entries available."

  return entries
    .map(
      (e) =>
        `## ${e.title}\n${e.content}\nTags: ${Object.values(e.tags)
          .filter(Boolean)
          .join(", ")}`
    )
    .join("\n\n---\n\n")
}
