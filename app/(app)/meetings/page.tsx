"use client"

import { useState, useEffect, useCallback } from "react"
import { useCompletion } from "@ai-sdk/react"
import { toast } from "sonner"
import {
  CalendarDays,
  Video,
  FileText,
  Search,
  Loader2,
  ChevronRight,
  X,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { getKnowledgeContext } from "@/lib/db/knowledge"
import { saveHistoryEntry } from "@/lib/db/history"

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: Array<{ email: string; displayName?: string }>
  hangoutLink?: string
  conferenceData?: { conferenceId?: string }
  status: string
}

interface TranscriptFile {
  id: string
  name: string
  createdTime: string
  webViewLink: string
  mimeType: string
  score?: number
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function getDuration(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}`
}

function isPast(dateStr: string) {
  return new Date(dateStr) < new Date()
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
  const positions: { key: string; index: number }[] = []
  for (const m of markers) {
    const match = m.pattern.exec(text)
    if (match) positions.push({ key: m.key, index: match.index })
  }
  positions.sort((a, b) => a.index - b.index)
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index
    const end = i + 1 < positions.length ? positions[i + 1].index : text.length
    sections[positions[i].key] = text.slice(start, end).replace(/^##\s*[^\n]+\n/, "").trim()
  }
  return sections
}

export default function MeetingsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "past" | "upcoming">("all")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [transcript, setTranscript] = useState("")
  const [transcriptFiles, setTranscriptFiles] = useState<TranscriptFile[]>([])
  const [searchingTranscript, setSearchingTranscript] = useState(false)
  const [knowledgeContext, setKnowledgeContext] = useState("")
  const [sections, setSections] = useState<Record<string, string> | null>(null)
  const [saved, setSaved] = useState(false)
  const [emailDraft, setEmailDraft] = useState("")
  const [providerToken, setProviderToken] = useState<string | null>(null)

  useEffect(() => {
    getKnowledgeContext().then(setKnowledgeContext)
  }, [])

  useEffect(() => {
    // Get provider token for Drive transcript search (still needs user OAuth)
    const initToken = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setProviderToken(session?.provider_token ?? null)
    }
    initToken()
  }, [])

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        // Uses service account — no user token needed
        const res = await fetch("/api/meetings")
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err?.error ?? "Failed to load meetings")
        }
        const data = await res.json()
        const items: CalendarEvent[] = (data.items ?? []).filter(
          (e: CalendarEvent) => e.status !== "cancelled" && (e.hangoutLink || e.summary)
        )
        items.sort((a, b) => {
          const aTime = new Date(a.start.dateTime ?? a.start.date ?? "").getTime()
          const bTime = new Date(b.start.dateTime ?? b.start.date ?? "").getTime()
          return bTime - aTime
        })
        setEvents(items)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load calendar")
      } finally {
        setLoading(false)
      }
    }
    loadMeetings()
  }, [])

  const findTranscript = useCallback(async (event: CalendarEvent) => {
    if (!providerToken) return
    setSearchingTranscript(true)
    setTranscriptFiles([])
    setTranscript("")

    const dateStr = event.start.dateTime ?? event.start.date ?? ""
    const title = event.summary ?? ""

    try {
      const res = await fetch(
        `/api/meetings/transcript?title=${encodeURIComponent(title)}&date=${encodeURIComponent(dateStr)}`,
        { headers: { Authorization: `Bearer ${providerToken}` } }
      )
      const data = await res.json()
      setTranscriptFiles(data.files ?? [])
      if (!data.files?.length) {
        toast.error("No transcript found for this meeting.")
      }
    } catch {
      toast.error("Failed to search for transcript.")
    } finally {
      setSearchingTranscript(false)
    }
  }, [providerToken])

  const loadTranscriptContent = async (file: TranscriptFile) => {
    if (!providerToken) return
    setSearchingTranscript(true)
    try {
      const res = await fetch(
        `/api/meetings/transcript?fileId=${file.id}`,
        { headers: { Authorization: `Bearer ${providerToken}` } }
      )
      const data = await res.json()
      setTranscript(data.transcript ?? "")
      setTranscriptFiles([])
      toast.success("Transcript loaded!")
    } catch {
      toast.error("Failed to load transcript content.")
    } finally {
      setSearchingTranscript(false)
    }
  }

  const { complete, completion, isLoading: analyzing } = useCompletion({
    api: "/api/analyze",
    streamProtocol: "text",
    onFinish: (_p, result) => {
      const parsed = parseAnalysis(result)
      setSections(parsed)
      setEmailDraft(parsed.email ?? "")
    },
    onError: () => toast.error("Analysis failed."),
  })

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast.error("Paste or load a transcript first.")
      return
    }
    setSections(null)
    setSaved(false)
    await complete("", { body: { transcript, knowledgeBase: knowledgeContext } })
  }

  const saveAnalysis = async () => {
    if (!sections || !selectedEvent) return
    await saveHistoryEntry({
      type: "copilot",
      title: `Meeting: ${selectedEvent.summary} — ${formatDate(selectedEvent.start.dateTime ?? selectedEvent.start.date ?? "")}`,
      summary: sections.summary?.slice(0, 200) ?? "",
      full_content: completion,
    })
    setSaved(true)
    toast.success("Analysis saved to history!")
  }

  const filteredEvents = events.filter((e) => {
    const startStr = e.start.dateTime ?? e.start.date ?? ""
    if (filter === "past") return isPast(startStr)
    if (filter === "upcoming") return !isPast(startStr)
    return true
  })

  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setTranscript("")
    setTranscriptFiles([])
    setSections(null)
    setSaved(false)
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Meeting List */}
      <div className={selectedEvent ? "w-80 flex-shrink-0" : "flex-1"}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Meetings</h1>
            <p className="text-sm text-slate-500">
              BHI sales calls from your shared calendar
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
          {(["all", "past", "upcoming"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Calendar access issue</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
              <p className="text-xs text-slate-500 mt-2">
                Sign out and sign in again to grant calendar permissions.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredEvents.length === 0 && (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No meetings found</p>
            <p className="text-slate-400 text-xs mt-1">
              Make sure your BHI meetings are added to the shared calendar.
            </p>
          </div>
        )}

        {/* Meeting list */}
        <div className="space-y-2">
          {filteredEvents.map((event) => {
            const startStr = event.start.dateTime ?? event.start.date ?? ""
            const endStr = event.end.dateTime ?? event.end.date ?? ""
            const past = isPast(startStr)
            const isSelected = selectedEvent?.id === event.id

            return (
              <button
                key={event.id}
                onClick={() => openEvent(event)}
                className={`w-full text-left bg-white border rounded-xl p-4 hover:border-blue-300 transition-all ${
                  isSelected
                    ? "border-blue-400 ring-1 ring-blue-200"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {past ? (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Past
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          Upcoming
                        </span>
                      )}
                      {event.hangoutLink && (
                        <Video className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {event.summary ?? "Untitled Meeting"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {startStr.includes("T")
                          ? `${formatDate(startStr)} · ${formatTime(startStr)}`
                          : formatDate(startStr)}
                      </span>
                      {startStr.includes("T") && endStr.includes("T") && (
                        <span className="text-xs text-slate-400">
                          {getDuration(startStr, endStr)}
                        </span>
                      )}
                    </div>
                    {event.attendees && event.attendees.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Analysis Panel */}
      {selectedEvent && (
        <div className="flex-1 min-w-0 overflow-y-auto">
          {/* Panel header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {selectedEvent.summary}
              </h2>
              <p className="text-sm text-slate-500">
                {formatDate(selectedEvent.start.dateTime ?? selectedEvent.start.date ?? "")}
                {selectedEvent.start.dateTime &&
                  ` · ${formatTime(selectedEvent.start.dateTime)}`}
                {selectedEvent.attendees?.length
                  ? ` · ${selectedEvent.attendees.length} attendees`
                  : ""}
              </p>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Attendees */}
          {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-medium text-slate-600 mb-1.5">Attendees</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedEvent.attendees.map((a) => (
                  <span
                    key={a.email}
                    className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-600"
                  >
                    {a.displayName ?? a.email}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Find transcript */}
          {!transcript && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">
                Step 1 — Load Transcript
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Search your Google Drive for the Meet transcript, or paste it manually below.
              </p>

              {isPast(selectedEvent.start.dateTime ?? selectedEvent.start.date ?? "") && (
                <Button
                  onClick={() => findTranscript(selectedEvent)}
                  disabled={searchingTranscript}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 mb-3"
                >
                  {searchingTranscript ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  Search Drive for Transcript
                </Button>
              )}

              {/* Transcript file results */}
              {transcriptFiles.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-xs font-medium text-slate-600">
                    Found {transcriptFiles.length} file{transcriptFiles.length !== 1 ? "s" : ""}:
                  </p>
                  {transcriptFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-700 truncate">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-blue-100 text-blue-400"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <Button
                          size="sm"
                          onClick={() => loadTranscriptContent(file)}
                          disabled={searchingTranscript}
                          className="text-xs h-7 px-2 bg-blue-600 hover:bg-blue-700"
                        >
                          Use This
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual paste */}
              <div>
                <p className="text-xs text-slate-500 mb-1.5">
                  Or paste the transcript manually:
                </p>
                <textarea
                  className="w-full min-h-[140px] text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-300"
                  placeholder="Paste your Google Meet transcript here…"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Transcript loaded */}
          {transcript && !sections && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-700">
                    Transcript ready — {transcript.length.toLocaleString()} characters
                  </p>
                </div>
                <button
                  onClick={() => setTranscript("")}
                  className="text-xs text-green-600 hover:underline"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Analyze */}
          {transcript && !sections && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Streaming preview */}
          {analyzing && completion && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Generating analysis…</span>
              </div>
              <p className="text-xs text-slate-500 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                {completion.slice(-400)}
              </p>
            </div>
          )}

          {/* Analysis results */}
          {sections && (
            <div className="space-y-3">
              {[
                { key: "summary", title: "Executive Summary", color: "border-l-teal-400" },
                { key: "objections", title: "Key Objections Raised", color: "border-l-red-400" },
                { key: "handling", title: "Objection Handling", color: "border-l-amber-400" },
                { key: "followup", title: "Follow-Up Actions", color: "border-l-blue-400" },
              ].map((def) =>
                sections[def.key] ? (
                  <div
                    key={def.key}
                    className={`bg-white border border-slate-200 border-l-4 ${def.color} rounded-xl p-4`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-800">{def.title}</h3>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sections[def.key])
                          toast.success("Copied!")
                        }}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {sections[def.key]}
                    </p>
                  </div>
                ) : null
              )}

              {/* Email draft */}
              {emailDraft && (
                <div className="bg-white border border-slate-200 border-l-4 border-l-purple-400 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-800">Follow-Up Email</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(emailDraft)
                        toast.success("Email copied!")
                      }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Editable — customize before sending</p>
                  <textarea
                    className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 min-h-[120px]"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                {!saved ? (
                  <Button
                    onClick={() => void saveAnalysis()}
                    className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                  >
                    Save Analysis
                  </Button>
                ) : (
                  <Button disabled className="gap-1.5 bg-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Saved to History
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
