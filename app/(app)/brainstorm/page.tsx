"use client"

import { useState, useEffect } from "react"
import { useCompletion } from "@ai-sdk/react"
import { toast } from "sonner"
import {
  Lightbulb,
  Send,
  Copy,
  Loader2,
  Zap,
  Shield,
  HelpCircle,
  Target,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getKnowledgeContext } from "@/lib/db/knowledge"
import { saveHistoryEntry } from "@/lib/db/history"

interface PrepForm {
  prospectName: string
  industry: string
  dealStage: string
  challenges: string
}

interface PrepSections {
  objections: string
  arguments: string
  questions: string
  positioning: string
}

const dealStages = [
  "Prospecting",
  "Discovery",
  "Qualification",
  "Proposal",
  "Evaluation",
  "Negotiation",
  "Closing",
]

function parsePrep(text: string): PrepSections {
  const extract = (pattern: RegExp, nextPattern?: RegExp): string => {
    const start = pattern.exec(text)
    if (!start) return ""
    const from = start.index + start[0].length
    const end = nextPattern ? nextPattern.exec(text.slice(from)) : null
    return end
      ? text.slice(from, from + end.index).trim()
      : text.slice(from).trim()
  }

  return {
    objections: extract(
      /##\s*Likely Objections/i,
      /##\s*(Strongest Counter|Counter-Arguments|Counter Arguments)/i
    ),
    arguments: extract(
      /##\s*(Strongest Counter|Counter-Arguments|Counter Arguments)/i,
      /##\s*(Questions to Ask|Expert Questions)/i
    ),
    questions: extract(
      /##\s*(Questions to Ask|Expert Questions)/i,
      /##\s*(Competitive Positioning|Positioning Angles)/i
    ),
    positioning: extract(
      /##\s*(Competitive Positioning|Positioning Angles)/i
    ),
  }
}

function BrainstormCard({
  icon: Icon,
  title,
  content,
  iconBg,
  iconColor,
  borderColor,
}: {
  icon: React.ElementType
  title: string
  content: string
  iconBg: string
  iconColor: string
  borderColor: string
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast.success("Copied to clipboard!")
  }

  const lines = content.split("\n").filter((l) => l.trim())

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${borderColor} rounded-xl p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}
          >
            <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Copy to clipboard"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const clean = line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "")
          const isBullet =
            line.trimStart().startsWith("-") ||
            line.trimStart().startsWith("*") ||
            line.trimStart().startsWith("•")
          const isNumber = /^\d+\./.test(line.trim())
          return (
            <p
              key={i}
              className={`text-sm text-slate-700 leading-relaxed ${
                isBullet || isNumber ? "pl-3 flex gap-2" : ""
              }`}
            >
              {(isBullet || isNumber) && (
                <span className="text-slate-400 flex-shrink-0 mt-0.5">
                  {isNumber ? `${i + 1}.` : "•"}
                </span>
              )}
              <span>{clean}</span>
            </p>
          )
        })}
      </div>
    </div>
  )
}

export default function BrainstormPage() {
  const [form, setForm] = useState<PrepForm>({
    prospectName: "",
    industry: "",
    dealStage: "Discovery",
    challenges: "",
  })
  const [knowledgeContext, setKnowledgeContext] = useState("")
  const [sections, setSections] = useState<PrepSections | null>(null)
  const [saved, setSaved] = useState(false)
  const [rawCompletion, setRawCompletion] = useState("")

  useEffect(() => {
    getKnowledgeContext().then(setKnowledgeContext)
  }, [])

  const { complete, completion, isLoading } = useCompletion({
    api: "/api/brainstorm",
    onFinish: (_prompt, result) => {
      const parsed = parsePrep(result)
      setSections(parsed)
      setRawCompletion(result)
    },
    onError: () => toast.error("Generation failed. Check your API key."),
  })

  const handleGenerate = async () => {
    if (!form.prospectName.trim() || !form.industry.trim()) {
      toast.error("Please fill in prospect name and industry.")
      return
    }
    setSections(null)
    setSaved(false)
    await complete("", {
      body: { ...form, knowledgeBase: knowledgeContext },
    })
  }

  const saveSession = async () => {
    await saveHistoryEntry({
      type: "brainstorm",
      title: `Brainstorm — ${form.prospectName} (${form.industry})`,
      summary: `${form.dealStage} stage. Challenges: ${form.challenges.slice(0, 100)}`,
      full_content: rawCompletion,
    })
    setSaved(true)
    toast.success("Session saved to history!")
  }

  const cardDefs = [
    {
      key: "objections" as const,
      title: "Likely Objections",
      icon: Shield,
      iconBg: "bg-red-100",
      iconColor: "text-red-500",
      borderColor: "border-l-red-300",
    },
    {
      key: "arguments" as const,
      title: "Strongest Counter-Arguments",
      icon: Zap,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      borderColor: "border-l-amber-300",
    },
    {
      key: "questions" as const,
      title: "Expert Questions to Ask",
      icon: HelpCircle,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      borderColor: "border-l-blue-300",
    },
    {
      key: "positioning" as const,
      title: "Competitive Positioning",
      icon: Target,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      borderColor: "border-l-purple-300",
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Brainstorm Prep</h1>
          <p className="text-sm text-slate-500">
            Generate consultant-level preparation for your next meeting.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label
              htmlFor="prospectName"
              className="text-sm font-medium text-slate-700 mb-1.5 block"
            >
              Prospect Name / Company
            </Label>
            <Input
              id="prospectName"
              placeholder="e.g. Acme Corp"
              value={form.prospectName}
              onChange={(e) => setForm({ ...form, prospectName: e.target.value })}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label
              htmlFor="industry"
              className="text-sm font-medium text-slate-700 mb-1.5 block"
            >
              Industry
            </Label>
            <Input
              id="industry"
              placeholder="e.g. B2B SaaS, Healthcare, Manufacturing"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mb-4">
          <Label
            htmlFor="dealStage"
            className="text-sm font-medium text-slate-700 mb-1.5 block"
          >
            Deal Stage
          </Label>
          <select
            id="dealStage"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={form.dealStage}
            onChange={(e) => setForm({ ...form, dealStage: e.target.value })}
            disabled={isLoading}
          >
            {dealStages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <Label
            htmlFor="challenges"
            className="text-sm font-medium text-slate-700 mb-1.5 block"
          >
            Known Challenges / Context
          </Label>
          <textarea
            id="challenges"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="e.g. Currently using a competitor, concerned about price, CFO needs approval..."
            value={form.challenges}
            onChange={(e) => setForm({ ...form, challenges: e.target.value })}
            disabled={isLoading}
            rows={3}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !form.prospectName.trim() || !form.industry.trim()}
            className="gap-1.5 bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Generate Prep
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && !sections && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-5"
            >
              <Skeleton className="h-4 w-48 mb-3" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-5/6 mb-2" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Streaming preview */}
      {isLoading && completion && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            <span className="text-sm font-medium text-orange-600">
              Generating prep…
            </span>
          </div>
          <div className="text-xs text-slate-600 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {completion}
          </div>
        </div>
      )}

      {/* Results */}
      {sections && (
        <>
          <div className="space-y-3">
            {cardDefs.map((def) =>
              sections[def.key] ? (
                <BrainstormCard
                  key={def.key}
                  title={def.title}
                  content={sections[def.key]}
                  icon={def.icon}
                  iconBg={def.iconBg}
                  iconColor={def.iconColor}
                  borderColor={def.borderColor}
                />
              ) : null
            )}
          </div>
          <div className="flex justify-end mt-4">
            {!saved ? (
              <Button
                onClick={() => void saveSession()}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700"
              >
                <Save className="w-4 h-4" />
                Save to History
              </Button>
            ) : (
              <Button
                disabled
                className="gap-1.5 bg-green-600"
              >
                Saved
              </Button>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !sections && (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
          <Lightbulb className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            No prep generated yet
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Fill in the form above and click Generate Prep.
          </p>
        </div>
      )}
    </div>
  )
}
