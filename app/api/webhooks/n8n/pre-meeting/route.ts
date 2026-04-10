import { NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { validateWebhookKey, unauthorizedResponse } from "@/lib/auth/webhook"
import { createAdminClient } from "@/lib/supabase/admin"
import { PREP_SYSTEM_PROMPT, buildPrepUserPrompt } from "@/lib/prompts/analysis"

/**
 * POST /api/webhooks/n8n/pre-meeting
 *
 * Called by n8n ~1 hour before a meeting. Generates a meeting briefing
 * using knowledge base + history context, saves it, and notifies the rep.
 */
export async function POST(req: Request) {
  if (!validateWebhookKey(req)) return unauthorizedResponse()

  const supabase = createAdminClient()

  let runId: string | undefined

  try {
    const body = await req.json()
    const { meetingTitle, meetingDate, prospectName, industry, userId } = body

    if (!meetingTitle || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: meetingTitle, userId" },
        { status: 400 }
      )
    }

    // 1. Create automation run record
    const { data: run } = await supabase
      .from("automation_runs")
      .insert({
        type: "pre_meeting_prep",
        meeting_title: meetingTitle,
        calendar_event_id: body.calendarEventId ?? null,
        status: "running",
      })
      .select()
      .single()

    runId = run?.id

    // 2. Search knowledge base for relevant insights
    let knowledgeContext: string | undefined
    if (industry || prospectName) {
      const searchTerms = [industry, prospectName].filter(Boolean).join(" ").toLowerCase()
      const keywords = searchTerms.split(/\s+/)

      const { data: knowledgeEntries } = await supabase
        .from("knowledge_entries")
        .select("*")
        .order("created_at", { ascending: false })

      if (knowledgeEntries?.length) {
        const relevant = knowledgeEntries
          .map((entry) => {
            const text = `${entry.title} ${entry.content} ${entry.tag_industry ?? ""} ${entry.tag_deal_stage ?? ""} ${entry.tag_objection ?? ""}`.toLowerCase()
            const score = keywords.reduce((acc: number, kw: string) => acc + (text.includes(kw) ? 1 : 0), 0)
            return { ...entry, score }
          })
          .filter((e) => e.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)

        if (relevant.length > 0) {
          knowledgeContext = relevant.map((e) => `## ${e.title}\n${e.content}`).join("\n\n---\n\n")
        }
      }
    }

    // 3. Search history for past interactions
    let historyContext: string | undefined
    if (prospectName) {
      const { data: historyEntries } = await supabase
        .from("history_entries")
        .select("*")
        .order("created_at", { ascending: false })

      if (historyEntries?.length) {
        const queryLower = prospectName.toLowerCase()
        const keywords = queryLower.split(/\s+/)

        const matched = historyEntries
          .filter((entry) => {
            const text = `${entry.title} ${entry.summary} ${entry.full_content}`.toLowerCase()
            return keywords.some((kw: string) => text.includes(kw))
          })
          .slice(0, 3)

        if (matched.length > 0) {
          historyContext = matched
            .map((e) => `### ${e.title} (${new Date(e.created_at).toLocaleDateString()})\n${e.summary}`)
            .join("\n\n")
        }
      }
    }

    // 4. Generate meeting prep via OpenAI
    const { text: prepResult } = await generateText({
      model: openai("gpt-4o-mini"),
      system: PREP_SYSTEM_PROMPT,
      prompt: buildPrepUserPrompt({
        prospectName: prospectName ?? meetingTitle,
        industry: industry ?? "unknown",
        dealStage: body.dealStage,
        challenges: body.challenges,
        knowledgeContext,
        historyContext,
      }),
    })

    // 5. Save to history_entries
    const { data: historyEntry } = await supabase
      .from("history_entries")
      .insert({
        user_id: userId,
        type: "brainstorm",
        title: `Auto-prep: ${meetingTitle}`,
        summary: prepResult.slice(0, 500),
        full_content: prepResult,
      })
      .select()
      .single()

    // 6. Create notification
    const meetingTime = meetingDate
      ? new Date(meetingDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : ""

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "pre_meeting_prep",
      title: `Briefing ready: ${meetingTitle}`,
      body: `Your meeting prep for "${meetingTitle}"${meetingTime ? ` at ${meetingTime}` : ""} is ready. Review it before the call!`,
      link: `/history`,
    })

    // 7. Update automation run
    if (runId) {
      await supabase
        .from("automation_runs")
        .update({
          status: "completed",
          result: { historyEntryId: historyEntry?.id },
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId)
    }

    return NextResponse.json({
      success: true,
      historyEntryId: historyEntry?.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (runId) {
      await supabase
        .from("automation_runs")
        .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
        .eq("id", runId)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
