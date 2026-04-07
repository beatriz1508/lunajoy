import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { TRAINING_SCENARIOS } from "@/lib/seedData"

const BASE_SYSTEM = `You are an expert B2B sales consultant with 15+ years experience.
Your role is to help sales reps become consultants — not just pitch features,
but diagnose problems, challenge assumptions, and build business cases.
Always respond in the same language the user is writing in.`

export async function POST(req: Request) {
  const body = await req.json()

  // Feedback mode (triggered by useCompletion)
  if (body.mode === "feedback") {
    const { conversationText, scenarioId, scenario, prospectProfile } = body
    const sc = TRAINING_SCENARIOS.find((s) => s.id === scenarioId)

    const result = await streamText({
      model: google("gemini-2.0-flash"),
      system: BASE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `You are evaluating a sales roleplay session. The sales rep was practicing handling this scenario:

**Scenario:** ${scenario || sc?.scenario || "N/A"}
**Prospect Profile:** ${prospectProfile || sc?.prospectProfile || "N/A"}

Here is the full conversation:

${conversationText}

Provide structured feedback using EXACTLY these section headers:

**Score: [0-100]**
(Give a score from 0-100. 80+ = consultant level, 60-79 = representative level, below 60 = needs work)

## What Went Well
(List 2-3 specific things the rep did well — reference actual moments from the conversation)

## What to Improve
(List 2-3 specific areas to improve with concrete suggestions — be direct and actionable)

## Model Answer
(Show the single best response the rep could have given at the most critical moment in the conversation. Make it consultant-level: focus on business outcomes, ask insightful questions, build the business case.)`,
        },
      ],
    })

    return result.toTextStreamResponse()
  }

  // Roleplay mode (triggered by useChat)
  const { messages, scenarioId } = body
  const sc = TRAINING_SCENARIOS.find((s) => s.id === scenarioId)

  if (!sc) {
    return new Response("Scenario not found", { status: 404 })
  }

  const result = await streamText({
    model: google("gemini-2.0-flash"),
    system: `${BASE_SYSTEM}

You are now playing the role of a prospect in a B2B sales training scenario.

**Your character:** ${sc.prospectProfile}
**Scenario context:** ${sc.scenario}

RULES:
1. Stay strictly in character as the prospect. Do NOT break character.
2. Be realistic — raise genuine concerns, don't be a pushover but also don't be impossible.
3. React naturally to what the sales rep says — if they make a good point, acknowledge it.
4. Keep responses concise (2-4 sentences) to keep the roleplay moving.
5. If the sales rep is clearly doing well (asking great questions, building business case), you can show signs of interest.
6. Do NOT provide sales advice, coaching, or feedback. Simply be the prospect.`,
    messages,
  })

  return result.toTextStreamResponse()
}
