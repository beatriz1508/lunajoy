"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Mic2, Lightbulb, BookOpen, GraduationCap, TrendingUp, MessageSquare,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/db/profile"
import type { HistoryEntry } from "@/lib/db/history"

const levelThresholds = [0, 200, 500, 1000, 2000]

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ analyses: 0, avgScore: 0, brainstorms: 0 })
  const [recentActivity, setRecentActivity] = useState<HistoryEntry[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: history }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("history_entries").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ])

      if (prof) setProfile(prof)

      const h = history ?? []
      setRecentActivity(h.slice(0, 3))
      const trainingSessions = h.filter((x) => x.type === "training")
      setStats({
        analyses: h.filter((x) => x.type === "copilot").length,
        brainstorms: h.filter((x) => x.type === "brainstorm").length,
        avgScore: trainingSessions.length
          ? Math.round(trainingSessions.reduce((a, b) => a + (b.score ?? 0), 0) / trainingSessions.length)
          : 0,
      })
    }
    load()
  }, [])

  const xp = profile?.xp ?? 0
  const level = profile?.level ?? 1
  const currentLevelXp = levelThresholds[level - 1] ?? 0
  const nextLevelXp = levelThresholds[level] ?? 2000
  const xpProgress = Math.min(Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100), 100)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-slate-500 mt-1">Continue your journey from representative to consultant.</p>
      </div>

      {/* XP Progress */}
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-semibold text-purple-500 uppercase tracking-wider">Current Level</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-bold text-purple-900">{profile?.level_name ?? "Rookie"}</span>
              <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium">Level {level}</span>
            </div>
          </div>
          <span className="text-sm font-medium text-purple-700">{xp} / {nextLevelXp} XP</span>
        </div>
        <div className="w-full bg-purple-200 rounded-full h-2">
          <div className="bg-purple-600 h-2 rounded-full transition-all duration-700" style={{ width: `${xpProgress}%` }} />
        </div>
        <p className="text-xs text-purple-500 mt-2">{nextLevelXp - xp} XP to next level</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Meetings Analyzed", value: stats.analyses, icon: Mic2, bg: "bg-teal-100", color: "text-teal-600" },
          { label: "Avg Training Score", value: stats.avgScore > 0 ? `${stats.avgScore}%` : "—", icon: TrendingUp, bg: "bg-blue-100", color: "text-blue-600" },
          { label: "Brainstorm Sessions", value: stats.brainstorms, icon: Lightbulb, bg: "bg-orange-100", color: "text-orange-500" },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <span className="text-sm text-slate-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {[
          { href: "/copilot", label: "Analyze Meeting", desc: "Paste a transcript for instant insights", icon: Mic2, bg: "bg-teal-100 group-hover:bg-teal-200", iconColor: "text-teal-600", border: "hover:border-teal-300 hover:bg-teal-50" },
          { href: "/brainstorm", label: "Prep for Meeting", desc: "Generate objection strategies", icon: Lightbulb, bg: "bg-orange-100 group-hover:bg-orange-200", iconColor: "text-orange-500", border: "hover:border-orange-300 hover:bg-orange-50" },
          { href: "/training", label: "Practice Scenario", desc: "Earn XP with roleplay sessions", icon: GraduationCap, bg: "bg-blue-100 group-hover:bg-blue-200", iconColor: "text-blue-600", border: "hover:border-blue-300 hover:bg-blue-50" },
          { href: "/knowledge", label: "Knowledge Base", desc: "Browse senior team insights", icon: BookOpen, bg: "bg-amber-100 group-hover:bg-amber-200", iconColor: "text-amber-600", border: "hover:border-amber-300 hover:bg-amber-50" },
        ].map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href} className={`group flex items-center gap-4 bg-white border border-slate-200 ${action.border} rounded-xl p-4 transition-all`}>
              <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center transition-colors flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <div>
                <p className="font-medium text-slate-800 text-sm">{action.label}</p>
                <p className="text-xs text-slate-500">{action.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Recent Activity */}
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Activity</h2>
      {recentActivity.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No activity yet</p>
          <p className="text-slate-400 text-xs mt-1">Start by analyzing a meeting or trying a training scenario.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentActivity.map((item) => (
            <Link key={item.id} href="/history" className="flex items-center gap-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === "copilot" ? "bg-teal-100" : item.type === "brainstorm" ? "bg-orange-100" : "bg-blue-100"}`}>
                {item.type === "copilot" && <Mic2 className="w-4 h-4 text-teal-600" />}
                {item.type === "brainstorm" && <Lightbulb className="w-4 h-4 text-orange-500" />}
                {item.type === "training" && <GraduationCap className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{item.title}</p>
                <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${item.type === "copilot" ? "bg-teal-100 text-teal-700" : item.type === "brainstorm" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                {item.type}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
