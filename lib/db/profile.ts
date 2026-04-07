import { createClient } from "@/lib/supabase/client"

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  xp: number
  level: number
  level_name: string
}

const levelThresholds = [0, 200, 500, 1000, 2000]
const levelNames = ["Rookie", "Representative", "Consultant", "Expert"]

export function computeLevel(xp: number): { level: number; level_name: string } {
  let level = 1
  let level_name = levelNames[0]
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (xp >= levelThresholds[i]) {
      level = i + 1
      level_name = levelNames[i] ?? "Expert"
      break
    }
  }
  return { level, level_name }
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  return data
}

export async function addXp(xpToAdd: number): Promise<Profile | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Read current XP first, then update atomically
  const { data: current } = await supabase
    .from("profiles")
    .select("xp")
    .eq("id", user.id)
    .single()

  const newXp = (current?.xp ?? 0) + xpToAdd
  const { level, level_name } = computeLevel(newXp)

  const { data } = await supabase
    .from("profiles")
    .update({ xp: newXp, level, level_name })
    .eq("id", user.id)
    .select()
    .single()
  return data
}
