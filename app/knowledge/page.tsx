"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { BookOpen, Plus, Search, Trash2, Tag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getKnowledgeEntries,
  saveKnowledgeEntry,
  deleteKnowledgeEntry,
  type KnowledgeEntry,
} from "@/lib/knowledge"
import { SEED_KNOWLEDGE } from "@/lib/seedData"
import { getItem } from "@/lib/storage"

const INDUSTRIES = [
  "B2B SaaS",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Logistics",
  "Education",
  "Other",
]
const DEAL_STAGES = [
  "Prospecting",
  "Discovery",
  "Qualification",
  "Proposal",
  "Evaluation",
  "Negotiation",
  "Closing",
]
const OBJECTION_TYPES = [
  "price",
  "competitor",
  "timing",
  "stakeholder",
  "ROI",
  "technical",
  "contract",
  "other",
]

const EMPTY_FORM = {
  title: "",
  content: "",
  tags: {
    industry: "",
    dealStage: "",
    objectionType: "",
  },
}

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState("")
  const [filterTag, setFilterTag] = useState("")
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = () => {
    const stored = getKnowledgeEntries()
    setEntries(stored)
  }

  useEffect(() => {
    // Ensure seed knowledge is loaded
    if (!getItem("seeded", false)) return
    load()
  }, [])

  // Reload entries after seeding
  useEffect(() => {
    load()
  }, [])

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required.")
      return
    }
    setSaving(true)
    saveKnowledgeEntry({
      title: form.title,
      content: form.content,
      tags: form.tags,
    })
    setForm(EMPTY_FORM)
    load()
    setSaving(false)
    toast.success("Knowledge entry saved!")
  }

  const handleDelete = (id: string) => {
    deleteKnowledgeEntry(id)
    load()
    toast.success("Entry deleted.")
  }

  const filteredEntries = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase())
    const matchTag =
      !filterTag ||
      Object.values(e.tags).some((t) =>
        t?.toLowerCase().includes(filterTag.toLowerCase())
      )
    return matchSearch && matchTag
  })

  const allTags = [
    ...new Set(
      entries.flatMap((e) => Object.values(e.tags).filter(Boolean) as string[])
    ),
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-sm text-slate-500">
            Senior insights injected into every AI prompt automatically.
          </p>
        </div>
      </div>

      <Tabs defaultValue="browse">
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="add">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Knowledge
          </TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search entries…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {filterTag && (
              <div className="flex items-center gap-1 bg-amber-100 text-amber-700 rounded-lg px-3 py-2 text-sm">
                <Tag className="w-3.5 h-3.5" />
                {filterTag}
                <button
                  onClick={() => setFilterTag("")}
                  className="ml-1 hover:text-amber-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filterTag === tag
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {filteredEntries.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">
                {entries.length === 0 ? "No entries yet" : "No results found"}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {entries.length === 0
                  ? "Add your first knowledge entry using the Add Knowledge tab."
                  : "Try a different search term or tag."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div
                    className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
                    onClick={() =>
                      setExpandedId(expandedId === entry.id ? null : entry.id)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 text-sm">
                        {entry.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(entry.tags).map(([k, v]) =>
                          v ? (
                            <span
                              key={k}
                              onClick={(e) => {
                                e.stopPropagation()
                                setFilterTag(v)
                              }}
                              className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100"
                            >
                              {v}
                            </span>
                          ) : null
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(entry.id)
                      }}
                      className="ml-3 p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {expandedId === entry.id && (
                    <div className="px-5 pb-4 border-t border-slate-100">
                      <p className="text-sm text-slate-700 leading-relaxed mt-3 whitespace-pre-wrap">
                        {entry.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Add Tab */}
        <TabsContent value="add">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <Label
                htmlFor="title"
                className="text-sm font-medium text-slate-700 mb-1.5 block"
              >
                Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g. How to handle price objections in negotiation"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <Label
                htmlFor="content"
                className="text-sm font-medium text-slate-700 mb-1.5 block"
              >
                Content *
              </Label>
              <textarea
                id="content"
                className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Share the insight, argument, or lesson learned. Be specific — this will be injected into AI prompts automatically..."
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
                rows={7}
              />
            </div>

            {/* Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Industry
                </Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.tags.industry}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tags: { ...form.tags, industry: e.target.value },
                    })
                  }
                >
                  <option value="">Any</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Deal Stage
                </Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.tags.dealStage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tags: { ...form.tags, dealStage: e.target.value },
                    })
                  }
                >
                  <option value="">Any</option>
                  {DEAL_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Objection Type
                </Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.tags.objectionType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tags: { ...form.tags, objectionType: e.target.value },
                    })
                  }
                >
                  <option value="">Any</option>
                  {OBJECTION_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.content.trim()}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4" />
                Save Entry
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
