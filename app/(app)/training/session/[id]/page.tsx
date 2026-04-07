"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useCompletion } from "@ai-sdk/react"
import { toast } from "sonner"
import Link from "next/link"
import {
  ArrowLeft,
  Send,
  Loader2,
  GraduationCap,
  User,
  Bot,
  Star,
  TrendingUp,
  ThumbsUp,
  AlertCircle,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TRAINING_SCENARIOS } from "@/lib/seedData"
import { addXp } from "@/lib/db/profile"
import { upsertTrainingProgress } from "@/lib/db/training"
import { saveHistoryEntry } from "@/lib/db/history"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface FeedbackData {
  score: number
  whatWentWell: string
  whatToImprove: string
  modelAnswer: string
}

const TURNS_BEFORE_FEEDBACK = 3

function parseFeedback(text: string): FeedbackData {
  const extract = (pattern: RegExp, nextPattern?: RegExp): string => {
    const match = pattern.exec(text)
    if (!match) return ""
    const from = match.index + match[0].length
    const nextMatch = nextPattern ? nextPattern.exec(text.slice(from)) : null
    return (nextMatch ? text.slice(from, from + nextMatch.index) : text.slice(from)).trim()
  }

  const scoreMatch = /\*?\*?Score[:\s]*(\d+)/i.exec(text)
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 70

  return {
    score,
    whatWentWell: extract(
      /##\s*(What Went Well|Strengths)/i,
      /##\s*(What to Improve|Areas for Improvement|Improvement)/i
    ),
    whatToImprove: extract(
      /##\s*(What to Improve|Areas for Improvement|Improvement)/i,
      /##\s*(Model Answer|Best Response|Ideal Response)/i
    ),
    modelAnswer: extract(/##\s*(Model Answer|Best Response|Ideal Response)/i),
  }
}

export default function TrainingSession({
  params,
}: {
  params: { id: string }
}) {
  const scenario = TRAINING_SCENARIOS.find((s) => s.id === params.id)

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    scenario
      ? [{ id: "intro", role: "assistant", content: scenario.scenario }]
      : []
  )
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userTurns, setUserTurns] = useState(0)
  const [feedbackRequested, setFeedbackRequested] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [xpAwarded, setXpAwarded] = useState(false)
  const [rawFeedback, setRawFeedback] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !scenario) return

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      }

      const updatedMessages = [...messages, userMsg]
      setMessages(updatedMessages)
      setInput("")
      setIsLoading(true)
      setUserTurns((t) => t + 1)

      try {
        const response = await fetch("/api/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            scenarioId: params.id,
          }),
        })

        if (!response.ok || !response.body) {
          toast.error("Failed to get response. Check your API key.")
          setIsLoading(false)
          return
        }

        const assistantId = crypto.randomUUID()
        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
        }
        setMessages((prev) => [...prev, assistantMsg])

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m
            )
          )
        }
      } catch {
        toast.error("Connection error.")
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, scenario, params.id]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Feedback via useCompletion
  const {
    complete: requestFeedback,
    completion: feedbackCompletion,
    isLoading: feedbackLoading,
  } = useCompletion({
    api: "/api/training",
    onFinish: (_p, result) => {
      const parsed = parseFeedback(result)
      setFeedback(parsed)
      setRawFeedback(result)
    },
    onError: () => toast.error("Failed to generate feedback."),
  })

  const handleGetFeedback = async () => {
    setFeedbackRequested(true)
    const conversationText = messages
      .map(
        (m) =>
          `${m.role === "user" ? "Sales Rep" : "Prospect"}: ${m.content}`
      )
      .join("\n\n")

    await requestFeedback("", {
      body: {
        mode: "feedback",
        scenarioId: params.id,
        conversationText,
        scenario: scenario?.scenario,
        prospectProfile: scenario?.prospectProfile,
      },
    })
  }

  // Award XP when feedback arrives
  useEffect(() => {
    if (!feedback || xpAwarded || !scenario) return
    setXpAwarded(true)

    const xpToAdd = Math.round((scenario.xpReward * feedback.score) / 100)

    Promise.all([
      addXp(xpToAdd),
      upsertTrainingProgress(scenario.id, {
        completed: true,
        score: feedback.score,
        xp_earned: xpToAdd,
      }),
      saveHistoryEntry({
        type: "training",
        title: `Training: ${scenario.name}`,
        summary: `Score: ${feedback.score}/100. ${feedback.whatWentWell.slice(0, 120)}`,
        full_content: rawFeedback,
        score: feedback.score,
        xp_earned: xpToAdd,
      }),
    ]).then(() => {
      toast.success(`+${xpToAdd} XP earned!`)
    }).catch(() => {
      toast.error("Failed to save progress.")
    })
  }, [feedback, xpAwarded, scenario, rawFeedback])

  if (!scenario) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Scenario not found.</p>
        <Link
          href="/training"
          className="text-blue-600 text-sm hover:underline mt-2 block"
        >
          Back to Training Hub
        </Link>
      </div>
    )
  }

  const showFeedbackButton =
    userTurns >= TURNS_BEFORE_FEEDBACK && !feedbackRequested && !feedback

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 7rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link
          href="/training"
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-900 truncate">
            {scenario.name}
          </h1>
          <p className="text-xs text-slate-500 truncate">
            {scenario.prospectProfile}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400">
            {userTurns}/{TURNS_BEFORE_FEEDBACK} turns
          </span>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            +{scenario.xpReward} XP
          </span>
        </div>
      </div>

      {/* Scenario context */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex-shrink-0">
        <p className="text-xs font-medium text-blue-700 mb-0.5">
          {scenario.difficulty} Scenario
        </p>
        <p className="text-xs text-blue-600">{scenario.description}</p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-2.5 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === "user" ? "bg-purple-100" : "bg-blue-100"
              }`}
            >
              {message.role === "user" ? (
                <User className="w-3.5 h-3.5 text-purple-600" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-blue-600" />
              )}
            </div>
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-purple-600 text-white rounded-tr-sm"
                  : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
              }`}
            >
              {message.content || (
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}

        {isLoading &&
          messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* Feedback trigger button */}
      {showFeedbackButton && (
        <div className="flex-shrink-0 py-3 border-t border-slate-200">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-blue-800 mb-1">
              Great practice session!
            </p>
            <p className="text-xs text-blue-600 mb-3">
              You've done {TURNS_BEFORE_FEEDBACK} turns. Get AI feedback and
              earn XP now!
            </p>
            <Button
              onClick={handleGetFeedback}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <Star className="w-4 h-4" />
              Get Feedback & Earn XP
            </Button>
          </div>
        </div>
      )}

      {/* Feedback loading */}
      {feedbackLoading && (
        <div className="flex-shrink-0 py-3 border-t border-slate-200">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Generating feedback…
              </span>
            </div>
            {feedbackCompletion && (
              <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">
                {feedbackCompletion.slice(-300)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Feedback results */}
      {feedback && (
        <div className="flex-shrink-0 space-y-3 py-3 border-t border-slate-200 overflow-y-auto max-h-80">
          {/* Score banner */}
          <div
            className={`rounded-xl p-4 flex items-center gap-4 ${
              feedback.score >= 80
                ? "bg-green-50 border border-green-200"
                : feedback.score >= 60
                ? "bg-amber-50 border border-amber-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                feedback.score >= 80
                  ? "bg-green-100 text-green-700"
                  : feedback.score >= 60
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {feedback.score}
            </div>
            <div>
              <p
                className={`font-bold text-base ${
                  feedback.score >= 80
                    ? "text-green-800"
                    : feedback.score >= 60
                    ? "text-amber-800"
                    : "text-red-800"
                }`}
              >
                {feedback.score >= 80
                  ? "Excellent Work!"
                  : feedback.score >= 60
                  ? "Good Effort!"
                  : "Keep Practicing!"}
              </p>
              <p className="text-xs text-slate-500">
                +{Math.round((scenario.xpReward * feedback.score) / 100)} XP
                earned
              </p>
            </div>
            <Trophy className="w-8 h-8 text-amber-400 ml-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-700">
                  What Went Well
                </p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {feedback.whatWentWell || "Good foundation shown."}
              </p>
            </div>
            <div className="bg-white border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-700">
                  What to Improve
                </p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {feedback.whatToImprove || "Continue practicing."}
              </p>
            </div>
          </div>

          {feedback.modelAnswer && (
            <div className="bg-white border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-purple-600" />
                <p className="text-sm font-semibold text-purple-700">
                  Model Answer
                </p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {feedback.modelAnswer}
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Link href="/training">
              <Button variant="outline" size="sm">
                Back to Training
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Input bar */}
      {!feedbackRequested && (
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 pt-3 border-t border-slate-200 flex-shrink-0"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your response as the sales rep…"
            disabled={isLoading}
            className="flex-1 h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 px-4"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
