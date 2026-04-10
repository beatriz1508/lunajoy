import { NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { validateWebhookKey, unauthorizedResponse } from "@/lib/auth/webhook"
import { createAdminClient } from "@/lib/supabase/admin"
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt, extractEmailDraft } from "@/lib/prompts/analysis"

/**
 * POST /api/webhooks/n8n/post-meeting
 *
 * Called by n8n after a meeting ends. Analyzes the transcript,
 * saves to history, creates a pending follow-up email, and notifies the rep.
 */
export async function POST(req: Request) {
  if (!validateWebhookKey(req)) return unauthorizedResponse()

  const supabase = createAdminClient()

  let runId: string | undefined

  try {
    const body = await req.json()
    const { meetingTitle, meetingDate, attendees, transcript, userId } = body

    if (!transcript || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: transcript, userId" },
        { status: 400 }
      )
    }

    // 1. Create automation run record
    const { data: run } = await supabase
      .from("automation_runs")
      .insert({
        type: "post_meeting_analysis",
        meeting_title: meetingTitle ?? "Untitled Meeting",
        calendar_event_id: body.calendarEventId ?? null,
        status: "running",
      })
      .select()
      .single()

    runId = run?.id

    // 2. Fetch knowledge base for context
    const { data: knowledgeEntries } = await supabase
      .from("knowledge_entries")
      .select("title, content, tag_industry, tag_deal_stage, tag_objection")
      .order("created_at", { ascending: false })
      .limit(10)

    const knowledgeContext = knowledgeEntries?.length
      ? knowledgeEntries.map((e) => `## ${e.title}\n${e.content}`).join("\n\n---\n\n")
      : undefined

    // 3. Run analysis via OpenAI
    const { text: analysisResult } = await generateText({
      model: openai("gpt-4o-mini"),
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: buildAnalysisUserPrompt(transcript.slice(0, 15000), knowledgeContext),
    })

    // 4. Save to history_entries
    const { data: historyEntry } = await supabase
      .from("history_entries")
      .insert({
        user_id: userId,
        type: "copilot",
        title: `Auto-analysis: ${meetingTitle ?? "Meeting"}`,
        summary: analysisResult.slice(0, 500),
        full_content: analysisResult,
      })
      .select()
      .single()

    // 5. Extract email draft and save as pending
    let pendingEmailId: string | null = null
    const emailDraft = extractEmailDraft(analysisResult)
    const recipientEmail = attendees?.[0]

    if (emailDraft && recipientEmail) {
      const { data: email } = await supabase
        .from("pending_emails")
        .insert({
          user_id: userId,
          to_email: recipientEmail,
          subject: emailDraft.subject,
          body_html: emailDraft.body,
          body_text: emailDraft.body,
          meeting_title: meetingTitle ?? null,
          meeting_date: meetingDate ?? null,
          source: "auto",
          status: "pending",
          history_entry_id: historyEntry?.id ?? null,
        })
        .select()
        .single()

      pendingEmailId = email?.id ?? null
    }

    // 6. Create notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "post_meeting_analysis",
      title: `Analysis ready: ${meetingTitle ?? "Meeting"}`,
      body: `Your meeting "${meetingTitle}" has been automatically analyzed.${pendingEmailId ? " A follow-up email draft is ready for your approval." : ""}`,
      link: pendingEmailId ? `/emails` : `/history`,
    })

    // 7. Update automation run
    if (runId) {
      await supabase
        .from("automation_runs")
        .update({
          status: "completed",
          result: { historyEntryId: historyEntry?.id, pendingEmailId },
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId)
    }

    return NextResponse.json({
      success: true,
      historyEntryId: historyEntry?.id,
      pendingEmailId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Update automation run with error
    if (runId) {
      await supabase
        .from("automation_runs")
        .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
        .eq("id", runId)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
