"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import {
  Send,
  Loader2,
  Bot,
  User,
  Wrench,
  CalendarDays,
  Search,
  BookOpen,
  FileText,
  Lightbulb,
  Sparkles,
  Paperclip,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const SUGGESTIONS = [
  { icon: CalendarDays, text: "What meetings do I have this week?" },
  { icon: Search, text: "Search the knowledge base for price objections" },
  { icon: FileText, text: "Help me prep for a call with a healthcare prospect" },
  { icon: Lightbulb, text: "What were my most recent analyses?" },
]

const TOOL_LABELS: Record<string, { label: string; iconName: string }> = {
  searchKnowledge: { label: "Searching knowledge base", iconName: "BookOpen" },
  listMeetings: { label: "Listing meetings", iconName: "CalendarDays" },
  createMeeting: { label: "Creating meeting", iconName: "CalendarDays" },
  searchHistory: { label: "Searching history", iconName: "Search" },
  saveInsight: { label: "Saving insight", iconName: "Lightbulb" },
  analyzeTranscript: { label: "Analyzing transcript", iconName: "FileText" },
  draftEmail: { label: "Drafting email for approval", iconName: "Mail" },
  prepMeeting: { label: "Preparing meeting brief", iconName: "Sparkles" },
}

function getToolIcon(iconName: string) {
  const icons: Record<string, React.ReactNode> = {
    BookOpen: <BookOpen className="w-3.5 h-3.5" />,
    CalendarDays: <CalendarDays className="w-3.5 h-3.5" />,
    Search: <Search className="w-3.5 h-3.5" />,
    Lightbulb: <Lightbulb className="w-3.5 h-3.5" />,
    FileText: <FileText className="w-3.5 h-3.5" />,
    Sparkles: <Sparkles className="w-3.5 h-3.5" />,
    Mail: <Mail className="w-3.5 h-3.5" />,
  }
  return icons[iconName] ?? <Wrench className="w-3.5 h-3.5" />
}

function ToolCallIndicator({ toolName, state }: { toolName: string; state: string }) {
  const info = TOOL_LABELS[toolName] ?? { label: toolName, iconName: "Wrench" }
  const isRunning = state === "input-streaming" || state === "input-available"

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 my-1">
      {isRunning ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />
      ) : (
        <span className="text-teal-500">{getToolIcon(info.iconName)}</span>
      )}
      <span>{info.label}{isRunning ? "..." : " - done"}</span>
    </div>
  )
}

function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ") || (line.startsWith("**") && line.endsWith("**")))
          return (
            <p key={i} className="font-semibold text-slate-800 text-sm mt-3 first:mt-0">
              {line.replace(/^##\s*/, "").replace(/^\*\*|\*\*$/g, "")}
            </p>
          )
        if (line.startsWith("- ") || line.startsWith("* "))
          return (
            <p key={i} className="text-sm text-slate-700 pl-3 before:content-['•'] before:mr-2 before:text-slate-400">
              {line.replace(/^[-*]\s+/, "").replace(/\*\*([^*]+)\*\*/g, "$1")}
            </p>
          )
        if (line.match(/^\d+\.\s/))
          return (
            <p key={i} className="text-sm text-slate-700 pl-3">
              {line.replace(/\*\*([^*]+)\*\*/g, "$1")}
            </p>
          )
        if (line.startsWith("- [ ]") || line.startsWith("- [x]"))
          return (
            <p key={i} className="text-sm text-slate-700 pl-3 flex items-start gap-2">
              <span className="mt-0.5 text-slate-400">{line.includes("[x]") ? "✅" : "☐"}</span>
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

// Transport configured to hit our agent API
const transport = new DefaultChatTransport({ api: "/api/agent" })

export default function CopilotPage() {
  const [inputValue, setInputValue] = useState("")
  const [transcriptAttachment, setTranscriptAttachment] = useState("")
  const [showTranscriptInput, setShowTranscriptInput] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: () => {
      toast.error("Something went wrong. Please try again.")
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = (text?: string) => {
    const msg = text ?? inputValue.trim()
    if (!msg || isLoading) return
    sendMessage({ text: msg })
    setInputValue("")
  }

  const handleTranscriptSubmit = () => {
    if (!transcriptAttachment.trim()) return
    const msg = `Analyze this meeting transcript:\n\n${transcriptAttachment}`
    setTranscriptAttachment("")
    setShowTranscriptInput(false)
    handleSend(msg)
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Luna AI Agent</h1>
          <p className="text-sm text-slate-500">
            Your sales AI assistant — ask anything, I'll use my tools to help.
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4">
        {/* Welcome state */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              Hey! I'm Luna, your sales AI.
            </h2>
            <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
              I can analyze meetings, search your knowledge base, prep for calls,
              check your calendar, and more. Just ask!
            </p>

            {/* Suggestion cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s.text)}
                  className="flex items-start gap-3 text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                >
                  <s.icon className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <div className="flex gap-3 justify-end">
                <div className="bg-teal-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]">
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <p key={i} className="text-sm whitespace-pre-wrap">{part.text}</p>
                    }
                    return null
                  })}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {message.parts.map((part, i) => {
                    // Dynamic tool calls (server-defined tools)
                    if (part.type === "dynamic-tool") {
                      return (
                        <ToolCallIndicator
                          key={i}
                          toolName={part.toolName}
                          state={part.state}
                        />
                      )
                    }
                    // Text content
                    if (part.type === "text" && part.text) {
                      return (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-[90%]">
                          <RenderMarkdown text={part.text} />
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {status === "submitted" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-teal-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                <span className="text-sm text-slate-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Transcript attachment */}
      {showTranscriptInput && (
        <div className="flex-shrink-0 bg-white border border-slate-200 rounded-xl p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Attach Meeting Transcript</p>
            <button
              onClick={() => setShowTranscriptInput(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          <textarea
            className="w-full min-h-[120px] text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-200"
            placeholder="Paste your meeting transcript here..."
            value={transcriptAttachment}
            onChange={(e) => setTranscriptAttachment(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={handleTranscriptSubmit}
              disabled={!transcriptAttachment.trim()}
              size="sm"
              className="gap-1.5 bg-teal-600 hover:bg-teal-700"
            >
              <Send className="w-3.5 h-3.5" />
              Analyze Transcript
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 pt-2 border-t border-slate-200">
        <div className="flex gap-2 items-end">
          <button
            type="button"
            onClick={() => setShowTranscriptInput(!showTranscriptInput)}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-300 transition-colors flex-shrink-0"
            title="Attach transcript"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Luna anything about your sales..."
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-teal-200 max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={isLoading}
            />
          </div>
          <Button
            type="button"
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="bg-teal-600 hover:bg-teal-700 rounded-xl px-4 h-11 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Luna can search your knowledge base, calendar, and history. Press Enter to send.
        </p>
      </div>
    </div>
  )
}
