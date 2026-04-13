import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { CLIENT_DOC_SYSTEM_PROMPT, buildClientDocPrompt } from "@/lib/prompts/analysis"

export async function POST(req: Request) {
  try {
    const { transcript, meetingTitle, meetingDate, attendees, knowledgeBase } = await req.json()

    if (!transcript) {
      return new Response("Missing transcript", { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: CLIENT_DOC_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildClientDocPrompt(
            transcript,
            meetingTitle,
            meetingDate,
            attendees,
            knowledgeBase
          ),
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
