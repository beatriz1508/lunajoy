"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { BookOpen, Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getKnowledgeEntries, saveKnowledgeEntry, deleteKnowledgeEntry, type KnowledgeEntry } from "@/lib/db/knowledge"

const INDUSTRIES = ["B2B SaaS", "Healthcare", "Finance", "Manufacturing", "Retail", "Logistics", "Education", "Other"]
const DEAL_STAGES = ["Prospecting", "Discovery", "Qualification", "Proposal", "Evaluation", "Negotiation", "Closing"]
const OBJECTION_TYPES = ["price", "competitor", "timing", "stakeholder", "ROI", "technical", "contract", "other"]
const EMPTY_FORM = { title: "", content: "", tag_industry: "", tag_deal_stage: "", tag_objection: "" }

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState("")
  const [filterTag, setFilterTag] = useState("")
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const data = await getKnowledgeEntries()
    setEntries(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error("Title and content are required."); return }
    setSaving(true)
    await saveKnowledgeEntry(form)
    setForm(EMPTY_FORM)
    await load()
    setSaving(false)
    toast.success("Knowledge entry saved!")
  }

  const handleDelete = async (id: string) => {
    await deleteKnowledgeEntry(id)
    await load()
    toast.success("Entry deleted.")
  }

  const allTags = [...new Set(entries.flatMap((e) =>
    [e.tag_industry, e.tag_deal_stage, e.tag_objection].filter(Boolean) as string[]
  ))]

  const filtered = entries.filter((e) => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.content.toLowerCase().includes(search.toLowerCase())
    const matchTag = !filterTag || [e.tag_industry, e.tag_deal_stage, e.tag_objection].includes(filterTag)
    return matchSearch && matchTag
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-sm text-slate-500">Shared team insights — injected into every AI prompt automatically.</p>
        </div>
      </div>

      <Tabs defaultValue="browse">
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="add"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search entries…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filterTag && (
              <div className="flex items-center gap-1 bg-amber-100 text-amber-700 rounded-lg px-3 py-2 text-sm">
                {filterTag}<button onClick={() => setFilterTag("")}><X className="w-3.5 h-3.5 ml-1" /></button>
              </div>
            )}
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {allTags.map((tag) => (
                <button key={tag} onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterTag === tag ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700"}`}>
                  {tag}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse"><div className="h-4 bg-slate-200 rounded w-64 mb-2"/><div className="h-3 bg-slate-100 rounded w-32"/></div>)}</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">{entries.length === 0 ? "No entries yet" : "No results found"}</p>
              <p className="text-slate-400 text-xs mt-1">{entries.length === 0 ? "Add your first entry using the Add Knowledge tab." : "Try a different search."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <div key={entry.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 text-sm">{entry.title}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[entry.tag_industry, entry.tag_deal_stage, entry.tag_objection].filter(Boolean).map((tag) => (
                          <span key={tag} onClick={(e) => { e.stopPropagation(); setFilterTag(tag!) }}
                            className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100">{tag}</span>
                        ))}
                        <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                      className="ml-3 p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {expandedId === entry.id && (
                    <div className="px-5 pb-4 border-t border-slate-100">
                      <p className="text-sm text-slate-700 leading-relaxed mt-3 whitespace-pre-wrap">{entry.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-slate-700 mb-1.5 block">Title *</Label>
              <Input id="title" placeholder="e.g. How to handle price objections in negotiation" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="content" className="text-sm font-medium text-slate-700 mb-1.5 block">Content *</Label>
              <textarea id="content" rows={7}
                className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Share the insight, argument, or lesson learned. This is injected into AI prompts automatically…"
                value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([["tag_industry","Industry",INDUSTRIES],["tag_deal_stage","Deal Stage",DEAL_STAGES],["tag_objection","Objection Type",OBJECTION_TYPES]] as const).map(([key, label, options]) => (
                <div key={key}>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
                    <option value="">Any</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()} className="gap-1.5 bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4" />Save Entry
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
