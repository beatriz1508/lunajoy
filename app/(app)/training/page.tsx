"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { GraduationCap, Star, Trophy, Zap, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { TRAINING_SCENARIOS } from "@/lib/seedData"
import { createClient } from "@/lib/supabase/client"
import { getTrainingProgress, type TrainingProgress } from "@/lib/db/training"
import type { Profile } from "@/lib/db/profile"

const levelThresholds = [0, 200, 500, 1000, 2000]
const levelNames = ["Rookie", "Representative", "Consultant", "Expert"]
const difficultyConfig = {
  Easy: { color: "bg-green-100 text-green-700" },
  Medium: { color: "bg-amber-100 text-amber-700" },
  Hard: { color: "bg-red-100 text-red-700" },
}

export default function TrainingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [progress, setProgress] = useState<Record<string, TrainingProgress>>({})

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, prog] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        getTrainingProgress(),
      ])
      if (prof) setProfile(prof)
      setProgress(prog)
    }
    load()
  }, [])

  const xp = profile?.xp ?? 0
  const level = profile?.level ?? 1
  const currentLevelXp = levelThresholds[level - 1] ?? 0
  const nextLevelXp = levelThresholds[level] ?? 2000
  const xpProgress = Math.min(Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100), 100)
  const completedCount = Object.values(progress).filter((p) => p.completed).length
  const totalXpEarned = Object.values(progress).reduce((sum, p) => sum + (p.xp_earned ?? 0), 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Training Hub</h1>
          <p className="text-sm text-slate-500">Roleplay scenarios with AI prospects. Earn XP and level up.</p>
        </div>
      </div>

      {/* Level card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Your Level</p>
              <p className="text-lg font-bold text-blue-900">{profile?.level_name ?? "Rookie"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-blue-700">{xp}</p>
            <p className="text-xs text-blue-500">total XP</p>
          </div>
        </div>
        <Progress value={xpProgress} className="h-2 bg-blue-200 [&>div]:bg-blue-600" />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-blue-500">{profile?.level_name ?? "Rookie"}</span>
          <span className="text-xs text-blue-500">{nextLevelXp - xp} XP to {levelNames[level] ?? "Max Level"}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Completed", value: completedCount },
          { label: "Scenarios", value: TRAINING_SCENARIOS.length },
          { label: "XP Earned", value: totalXpEarned },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Scenario cards */}
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Scenarios</h2>
      <div className="space-y-3">
        {TRAINING_SCENARIOS.map((scenario) => {
          const done = progress[scenario.id]?.completed ?? false
          const score = progress[scenario.id]?.score ?? null
          const diff = difficultyConfig[scenario.difficulty]
          return (
            <Link key={scenario.id} href={`/training/session/${scenario.id}`}
              className="group flex items-center gap-4 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm rounded-xl p-5 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? "bg-green-100" : "bg-blue-100"}`}>
                {done ? <Star className="w-5 h-5 text-green-600 fill-green-600" /> : <Zap className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="font-semibold text-slate-800 text-sm">{scenario.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color}`}>{scenario.difficulty}</span>
                  {done && score !== null && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Score: {score}%</span>}
                </div>
                <p className="text-xs text-slate-500 truncate">{scenario.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-700">+{scenario.xpReward} XP</p>
                  <p className="text-xs text-slate-400">reward</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Level progression */}
      <div className="mt-8 bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Level Progression</h3>
        <div className="flex items-center justify-between">
          {levelNames.map((name, i) => {
            const xpNeeded = levelThresholds[i]
            const reached = xp >= xpNeeded
            const isCurrent = level === i + 1
            return (
              <div key={name} className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isCurrent ? "bg-blue-600 text-white border-blue-600" : reached ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-slate-100 text-slate-400 border-slate-200"}`}>{i + 1}</div>
                <span className={`text-xs font-medium ${isCurrent ? "text-blue-700" : reached ? "text-blue-500" : "text-slate-400"}`}>{name}</span>
                <span className="text-xs text-slate-400">{xpNeeded === 0 ? "Start" : `${xpNeeded} XP`}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
