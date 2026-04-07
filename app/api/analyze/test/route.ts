// Simple test endpoint to verify streaming works
export async function POST() {
  const text = `## Executive Summary
This is a test analysis to verify streaming works correctly.

## Key Objections
- Test objection 1
- Test objection 2

## Objection Handling
- Objection 1 was handled by testing
- Objection 2 was handled by debugging

## Follow-Up Actions
- [ ] Verify this test works
- [ ] Remove test endpoint

## Follow-Up Email Draft
Subject: Test Follow-Up

Hi,

This is a test email draft.

Best regards`

  // Simulate streaming by returning the text as a stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const words = text.split(" ")
      let i = 0
      const interval = setInterval(() => {
        if (i < words.length) {
          controller.enqueue(encoder.encode(words[i] + " "))
          i++
        } else {
          controller.close()
          clearInterval(interval)
        }
      }, 20)
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
