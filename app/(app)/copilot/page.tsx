"use client"

import { useState, useEffect, useRef } from "react"
import { useCompletion } from "@ai-sdk/react"
import { toast } from "sonner"
import {
  Mic2,
  Send,
  Save,
  Copy,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { getKnowledgeContext } from "@/lib/db/knowledge"
import { saveHistoryEntry } from "@/lib/db/history"

interface AnalysisSection {
  id: string
  title: string
  content: string
  color: string
  icon: React.ReactNode
}

function parseAnalysis(text: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const markers = [
    { key: "summary", pattern: /##\s*Executive Summary/i },
    { key: "objections", pattern: /##\s*Key Objections/i },
    { key: "handling", pattern: /##\s*Objection Handling/i },
    { key: "followup", pattern: /##\s*Follow-Up Actions/i },
    { key: "email", pattern: /##\s*(Follow-Up Email|Email Draft)/i },
  ]

  const markerPositions: { key: string; index: number }[] = []
  for (const m of markers) {
    const match = m.pattern.exec(text)
    if (match) markerPositions.push({ key: m.key, index: match.index })
  }
  markerPositions.sort((a, b) => a.index - b.index)

  for (let i = 0; i < markerPositions.length; i++) {
    const start = markerPositions[i].index
    const end =
      i + 1 < markerPositions.length ? markerPositions[i + 1].index : text.length
    const slice = text.slice(start, end)
    const content = slice.replace(/^##\s*[^\n]+\n/, "").trim()
    sections[markerPositions[i].key] = content
  }

  return sections
}

function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <div className="ai-content space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ") || line.startsWith("**") && line.endsWith("**"))
          return (
            <p key={i} className="font-semibold text-slate-800 text-sm mt-2 first:mt-0">
              {line.replace(/^##\s*/, "").replace(/^\*\*|\*\*$/g, "")}
            </p>
          )
        if (line.startsWith("- ") || line.startsWith("* "))
          return (
            <p key={i} className="text-sm text-slate-700 pl-3 before:content-['•'] before:mr-2 before:text-slate-400">
              {line.replace(/^[-*]\s+/, "")}
            </p>
          )
        if (line.match(/^\d+\.\s/))
          return (
            <p key={i} className="text-sm text-slate-700 pl-3">
              {line}
            </p>
          )
        if (line.startsWith("- [ ]") || line.startsWith("- [x]"))
          return (
            <p key={i} className="text-sm text-slate-700 pl-3 flex items-start gap-2">
              <span className="mt-0.5 text-slate-400">☐</span>
              {line.replace(/^-\s\[[ x]\]\s*/, "")}
            </p>
          )
        if (line.trim() === "") return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm text-slate-700 leading-relaxed">
            {line.replace(/\*\*([^*]+)\*\*/g, "$1")}
          </p>
        )
      })}
    </div>
  )
}

function SectionCard({
  title,
  content,
  colorClass,
  editable = false,
  editValue,
  onEdit,
}: {
  title: string
  content: string
  colorClass: string
  editable?: boolean
  editValue?: string
  onEdit?: (v: string) => void
}) {
  const [open, setOpen] = useState(true)

  const handleCopy = () => {
    navigator.clipboard.writeText(editValue ?? content)
    toast.success("Copied to clipboard!")
  }

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${colorClass}`}>
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50"
        onClick={() => setOpen((o) => !o)}
      >
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {open ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>
      {open && (
        <div className="px-5 pb-4 border-t border-slate-100">
          {editable && onEdit ? (
            <textarea
              className="w-full mt-3 text-sm text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 min-h-[120px]"
              value={editValue}
              onChange={(e) => onEdit(e.target.value)}
            />
          ) : (
            <div className="mt-3">
              <RenderMarkdown text={content} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CopilotPage() {
  const [transcript, setTranscript] = useState("")
  const [knowledgeContext, setKnowledgeContext] = useState("")
  const [sections, setSections] = useState<Record<string, string> | null>(null)
  const [emailDraft, setEmailDraft] = useState("")
  const [saved, setSaved] = useState(false)
  const [debugInfo, setDebugInfo] = useState("")
  const prevCompletionRef = useRef("")

  useEffect(() => {
    getKnowledgeContext().then(setKnowledgeContext)
  }, [])

  const { complete, completion, isLoading } = useCompletion({
    api: "/api/analyze",
    streamProtocol: "text",
    onFinish: (_prompt, result) => {
      setDebugInfo(`onFinish: result length=${result?.length ?? "null"}, completion length=${completion?.length ?? "null"}. result first 200: [${result?.slice(0, 200) ?? "EMPTY"}]`)
      const parsed = parseAnalysis(result)
      setSections(parsed)
      setEmailDraft(parsed.email ?? "")
    },
    onError: (err) => {
      setDebugInfo(`onError: ${err?.message ?? String(err)}`)
      toast.error("Analysis failed. Check your API key.")
    },
  })

  // Test API key + Gemini directly
  const handleTestDirect = async () => {
    setDebugInfo("Step 1: Checking API key...")
    try {
      // Step 1: Check API key
      const keyRes = await fetch("/api/analyze/test")
      const keyData = await keyRes.json()

      // Step 2: Test Gemini generateText
      setDebugInfo(`Step 1: API key=${keyData.hasApiKey}, prefix=${keyData.keyPrefix}. Step 2: Testing Gemini...`)
      const geminiRes = await fetch("/api/analyze/test", { method: "POST" })
      const geminiData = await geminiRes.json()

      setDebugInfo(`API key: ${keyData.hasApiKey} (${keyData.keyPrefix}). Gemini test: status=${geminiRes.status}, success=${geminiData.success}, text=[${geminiData.text ?? geminiData.error}]`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setDebugInfo(`Test error: ${message}`)
    }
  }

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast.error("Please paste a meeting transcript first.")
      return
    }
    setSections(null)
    setSaved(false)
    setDebugInfo("Calling complete()...")
    prevCompletionRef.current = ""
    await complete("", {
      body: { transcript, knowledgeBase: knowledgeContext },
    })
  }

  const saveAnalysis = async () => {
    if (!sections) return
    await saveHistoryEntry({
      type: "copilot",
      title: `Meeting Analysis — ${new Date().toLocaleDateString()}`,
      summary: sections.summary?.slice(0, 200) ?? "",
      full_content: completion,
    })
    setSaved(true)
    toast.success("Analysis saved to history!")
  }

  const sectionDefs = [
    { key: "summary", title: "Executive Summary", color: "border-teal-200" },
    { key: "objections", title: "Key Objections Raised", color: "border-red-200" },
    { key: "handling", title: "Objection Handling", color: "border-amber-200" },
    { key: "followup", title: "Recommended Follow-Up Actions", color: "border-blue-200" },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meeting Copilot</h1>
          <p className="text-sm text-slate-500">
            Paste a transcript and get instant consultant-level analysis.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Transcript input */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Meeting Transcript
          </label>
          <Textarea
            placeholder="Paste your meeting transcript here — call notes, Zoom transcript, or any text format works..."
            className="min-h-[200px] resize-none text-sm"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-400">
              {transcript.length > 0 ? `${transcript.length} characters` : ""}
            </p>
            <div className="flex gap-2">
              {sections && !saved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void saveAnalysis()}
                  className="gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </Button>
              )}
              {saved && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1.5 text-green-600 border-green-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </Button>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={isLoading || !transcript.trim()}
                className="gap-1.5 bg-teal-600 hover:bg-teal-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading skeletons */}
        {isLoading && !sections && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <Skeleton className="h-4 w-40 mb-3" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-4/5 mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Streaming preview */}
        {isLoading && completion && !sections && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span className="text-sm font-medium text-teal-700">
                Generating analysis…
              </span>
            </div>
            <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-mono text-xs max-h-48 overflow-y-auto">
              {completion}
            </div>
          </div>
        )}

        {/* Results */}
        {sections && (
          <div className="space-y-3">
            {sectionDefs.map((def) =>
              sections[def.key] ? (
                <SectionCard
                  key={def.key}
                  title={def.title}
                  content={sections[def.key]}
                  colorClass={`border-slate-200 border-l-4 ${def.color.replace("border-", "border-l-")}`}
                />
              ) : null
            )}

            {/* Editable email draft */}
            {(sections.email || emailDraft) && (
              <div className="bg-white border border-slate-200 border-l-4 border-l-purple-300 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Follow-Up Email Draft
                  </h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(emailDraft)
                      toast.success("Email copied to clipboard!")
                    }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
                <div className="px-5 pb-4 pt-3">
                  <p className="text-xs text-slate-400 mb-2">
                    Editable — customize before sending
                  </p>
                  <textarea
                    className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 min-h-[160px]"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {!saved ? (
                <Button
                  onClick={() => void saveAnalysis()}
                  className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                >
                  <Save className="w-4 h-4" />
                  Save Analysis
                </Button>
              ) : (
                <Button
                  disabled
                  className="gap-1.5 bg-green-600"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Saved to History
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !sections && !completion && (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              No analysis yet
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Paste a transcript above and click Analyze to get started.
            </p>
          </div>
        )}
        {/* Debug info — remove after fixing */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <button
            onClick={handleTestDirect}
            className="mb-3 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            🧪 Test API Directly
          </button>
          {debugInfo && (
            <p className="text-xs font-mono text-red-800 break-all whitespace-pre-wrap">{debugInfo}</p>
          )}
        </div>
      </div>
    </div>
  )
}
