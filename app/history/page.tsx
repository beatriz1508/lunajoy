"use client"

import { useState, useEffect } from "react"
import {
  History,
  Mic2,
  Lightbulb,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Filter,
  Star,
} from "lucide-react"
import { getItem } from "@/lib/storage"
import type { HistoryEntry } from "@/lib/seedData"

type FilterType = "all" | "copilot" | "brainstorm" | "training"

const typeConfig = {
  copilot: {
    label: "Copilot",
    icon: Mic2,
    bg: "bg-teal-100",
    color: "text-teal-600",
    badge: "bg-teal-100 text-teal-700",
  },
  brainstorm: {
    label: "Brainstorm",
    icon: Lightbulb,
    bg: "bg-orange-100",
    color: "text-orange-500",
    badge: "bg-orange-100 text-orange-700",
  },
  training: {
    label: "Training",
    icon: GraduationCap,
    bg: "bg-blue-100",
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false)
  const config = typeConfig[entry.type]
  const Icon = config.icon

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
        >
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 text-sm truncate">
                {entry.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{formatDate(entry.date)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}
              >
                {config.label}
              </span>
              {entry.type === "training" && entry.score !== undefined && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  {entry.score}%
                </span>
              )}
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
            {entry.summary}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
              Full Content
            </p>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {entry.fullContent}
            </div>
          </div>
          {entry.type === "training" && entry.xpEarned !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                +{entry.xpEarned} XP earned
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [filter, setFilter] = useState<FilterType>("all")

  useEffect(() => {
    const stored = getItem<HistoryEntry[]>("history", [])
    setEntries([...stored].reverse())
  }, [])

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.type === filter)

  const counts = {
    all: entries.length,
    copilot: entries.filter((e) => e.type === "copilot").length,
    brainstorm: entries.filter((e) => e.type === "brainstorm").length,
    training: entries.filter((e) => e.type === "training").length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <History className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">History</h1>
          <p className="text-sm text-slate-500">
            All your saved analyses, brainstorms, and training sessions.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {(["all", "copilot", "brainstorm", "training"] as FilterType[]).map(
          (type) => {
            const isActive = filter === type
            const label =
              type === "all"
                ? `All (${counts.all})`
                : `${typeConfig[type].label} (${counts[type]})`
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            )
          }
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
          <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No entries found</p>
          <p className="text-slate-400 text-xs mt-1">
            {filter === "all"
              ? "Start using the platform to build your history."
              : `No ${filter} sessions recorded yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <HistoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
