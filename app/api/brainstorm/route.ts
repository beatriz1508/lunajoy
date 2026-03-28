import { google } from "@ai-sdk/google"
import { streamText } from "ai"

export const runtime = "edge"

const SYSTEM_PROMPT = `You are an expert B2B sales consultant with 15+ years experience.
Your role is to help sales reps become consultants — not just pitch features,
but diagnose problems, challenge assumptions, and build business cases.
Always respond in the same language the user is writing in.`

export async function POST(req: Request) {
  const { prospectName, industry, dealStage, challenges, knowledgeBase } =
    await req.json()

  if (!prospectName || !industry) {
    return new Response("Missing required fields", { status: 400 })
  }

  const knowledgeSection =
    knowledgeBase && knowledgeBase !== "No knowledge base entries available."
      ? `\n\n## Knowledge Base (Senior Team Insights)\n${knowledgeBase}`
      : ""

  const result = await streamText({
    model: google("gemini-2.0-flash"),
    system: SYSTEM_PROMPT + knowledgeSection,
    messages: [
      {
        role: "user",
        content: `Generate a consultant-level meeting preparation for the following prospect:

**Prospect/Company:** ${prospectName}
**Industry:** ${industry}
**Deal Stage:** ${dealStage}
**Known Challenges/Context:** ${challenges || "Not specified"}

Return your response using EXACTLY these section headers (in order):

## Likely Objections
(List 4-5 specific objections this type of prospect typically raises at this deal stage, with brief context for each. Use bullet points.)

## Strongest Counter-Arguments
(For each likely objection, provide a consultant-level counter-argument that focuses on business outcomes, not features. Use bullet points.)

## Questions to Ask
(List 5-6 open-ended discovery questions that demonstrate deep industry expertise and uncover hidden pain. These should make the prospect think.)

## Competitive Positioning
(3-4 specific angles to differentiate from competitors or the status quo, tailored to this industry and deal stage)`,
      },
    ],
  })

  return result.toTextStreamResponse()
}
