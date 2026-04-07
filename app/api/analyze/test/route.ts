import { google } from "@ai-sdk/google"
import { generateText, streamText } from "ai"

// Test 1: Plain text (no AI) — GET /api/analyze/test
export async function GET() {
  return new Response(
    JSON.stringify({
      hasApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      keyPrefix: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.slice(0, 8) ?? "NOT SET",
    }),
    { headers: { "Content-Type": "application/json" } }
  )
}

// Test 2: Gemini generateText (non-streaming) — POST /api/analyze/test
export async function POST() {
  try {
    // Test with generateText (non-streaming) to isolate the issue
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: "Say exactly: Hello, Gemini is working!",
    })

    return new Response(
      JSON.stringify({ success: true, text, length: text.length }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack?.slice(0, 500) : ""
    return new Response(
      JSON.stringify({ success: false, error: message, stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
