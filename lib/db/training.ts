import { createClient } from "@/lib/supabase/client"

export interface TrainingProgress {
  id: string
  user_id: string
  scenario_id: string
  completed: boolean
  score: number | null
  xp_earned: number | null
  updated_at: string
}

export async function getTrainingProgress(): Promise<
  Record<string, TrainingProgress>
> {
  const supabase = createClient()
  const { data } = await supabase.from("training_progress").select("*")
  if (!data) return {}
  return Object.fromEntries(data.map((row) => [row.scenario_id, row]))
}

export async function upsertTrainingProgress(
  scenarioId: string,
  values: { completed: boolean; score: number; xp_earned: number }
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("training_progress").upsert(
    {
      user_id: user.id,
      scenario_id: scenarioId,
      ...values,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,scenario_id" }
  )
}
