import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

const SYSTEM_PROMPT = `You are an expert B2B sales consultant with 15+ years experience.
Your role is to help sales reps become consultants — not just pitch features,
but diagnose problems, challenge assumptions, and build business cases.
Always respond in the same language the user is writing in.`

export async function POST(req: Request) {
  try {
    const { transcript, knowledgeBase } = await req.json()

    if (!transcript) {
      return new Response("Missing transcript", { status: 400 })
    }

    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const knowledgeSection =
      knowledgeBase && knowledgeBase !== "No knowledge base entries available."
        ? `\n\n## Knowledge Base (Senior Team Insights)\n${knowledgeBase}`
        : ""

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT + knowledgeSection,
      messages: [
        {
          role: "user",
          content: `Analyze this sales meeting transcript and provide structured insights.

Return your response using EXACTLY these section headers (in order):

## Executive Summary
(2-3 sentences covering what happened, the key outcome, and next step)

## Key Objections
(List every objection raised by the prospect, using bullet points)

## Objection Handling
(For each objection: how it was handled OR how it should have been handled. Use the knowledge base insights if relevant.)

## Follow-Up Actions
(Actionable checklist items using "- [ ] " format)

## Follow-Up Email Draft
(A complete, ready-to-send email with subject line)

---

TRANSCRIPT:
${transcript}`,
        },
      ],
    })

    return result.toTextStreamResponse()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
