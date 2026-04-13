/**
 * Shared prompts for transcript analysis.
 * Used by both the manual /api/analyze route and the automated n8n post-meeting webhook.
 */

export const ANALYSIS_SYSTEM_PROMPT = `You are an expert B2B sales consultant with 15+ years experience.
Your role is to help sales reps become consultants — not just pitch features,
but diagnose problems, challenge assumptions, and build business cases.
Always respond in English.`

export function buildAnalysisUserPrompt(transcript: string, knowledgeContext?: string): string {
  const knowledgeSection = knowledgeContext
    ? `\n\nUse these team knowledge base insights when relevant:\n${knowledgeContext}\n`
    : ""

  return `Analyze this sales meeting transcript and provide structured insights.
${knowledgeSection}
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
(A complete, ready-to-send email with subject line. Include "Subject:" on the first line, then the email body.)

---

TRANSCRIPT:
${transcript}`
}

/**
 * Extract the follow-up email draft section from an analysis result.
 * Returns { subject, body } or null if not found.
 *
 * Parsing strategy (intentionally not a single regex — JS regex has no \Z
 * anchor, so using \Z in a lookahead silently becomes a literal "Z" and
 * truncates the email at the first letter Z):
 *   1. Locate the "## Follow-Up Email Draft" header
 *   2. Take everything after it, up to the next "## " header, "---", or EOS
 *   3. Split by lines and pull out the Subject line
 */
export function extractEmailDraft(analysisText: string): { subject: string; body: string } | null {
  const headerRegex = /##\s*Follow-Up Email Draft\s*\n/i
  const headerMatch = analysisText.match(headerRegex)
  if (!headerMatch || headerMatch.index === undefined) return null

  const afterHeader = analysisText.slice(headerMatch.index + headerMatch[0].length)

  // Cut at next section header or "---" separator; otherwise take to EOS
  const endMatch = afterHeader.match(/\n##\s|\n---/)
  const emailContent = (endMatch ? afterHeader.slice(0, endMatch.index) : afterHeader).trim()
  if (!emailContent) return null

  // Pull out the Subject line. Handles markdown formatting from the model:
  //   "Subject: Foo"
  //   "**Subject:** Foo"
  //   "**Subject: Foo**"
  //   "Subject: **Foo**"
  const lines = emailContent.split("\n")
  let subject = "Follow-up"
  let bodyStartIdx = 0
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*\**\s*Subject:\s*\**\s*(.+?)\s*\**\s*$/i)
    if (m) {
      subject = m[1].replace(/^\**\s*|\s*\**$/g, "").trim()
      bodyStartIdx = i + 1
      // Skip blank lines (and leftover markdown markers) immediately after the subject
      while (
        bodyStartIdx < lines.length &&
        (lines[bodyStartIdx].trim() === "" || /^\*+$/.test(lines[bodyStartIdx].trim()))
      ) {
        bodyStartIdx++
      }
      break
    }
  }

  const body = lines.slice(bodyStartIdx).join("\n").trim()
  if (!body) return null
  return { subject, body }
}

export const PREP_SYSTEM_PROMPT = `You are an expert B2B sales consultant with 15+ years experience.
Generate a consultant-level meeting preparation. Be specific and actionable.
Always respond in English.`

export function buildPrepUserPrompt(params: {
  prospectName: string
  industry: string
  dealStage?: string
  challenges?: string
  knowledgeContext?: string
  historyContext?: string
}): string {
  let prompt = `Generate a consultant-level meeting prep for ${params.prospectName} (${params.industry}).`

  if (params.dealStage) {
    prompt += `\nCurrent deal stage: ${params.dealStage}`
  }
  if (params.challenges) {
    prompt += `\nKnown challenges: ${params.challenges}`
  }
  if (params.knowledgeContext) {
    prompt += `\n\nRelevant team knowledge base insights:\n${params.knowledgeContext}`
  }
  if (params.historyContext) {
    prompt += `\n\nPrevious interactions with this prospect:\n${params.historyContext}`
  }

  prompt += `\n\nReturn your response using EXACTLY these section headers:

## Prospect Overview
(Brief context about the company and industry)

## Likely Objections
(List the most probable objections they'll raise)

## Counter-Arguments
(For each objection, provide a strong counter-argument)

## Discovery Questions
(Strategic questions to uncover needs and pain points)

## Competitive Positioning
(How to position against likely competitors)

## Meeting Strategy
(Recommended approach and key talking points)`

  return prompt
}

// ---------------------------------------------------------------------------
// Follow-Up Email (standalone, no full analysis)
// ---------------------------------------------------------------------------

export function buildFollowUpEmailPrompt(
  transcript: string,
  meetingTitle?: string,
  attendees?: string[],
  knowledgeContext?: string
): string {
  const meta = [
    meetingTitle ? `Meeting: ${meetingTitle}` : "",
    attendees?.length ? `Attendees: ${attendees.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const kb = knowledgeContext
    ? `\nUse these team knowledge base insights when relevant:\n${knowledgeContext}\n`
    : ""

  return `Generate a personalized, professional follow-up email for this sales meeting.
${meta ? `\n${meta}` : ""}${kb}
Include "Subject:" on the very first line, then the email body starting on the next line.

The email should:
- Thank the prospect for their time
- Recap the key discussion points and value propositions
- List agreed-upon next steps with clear ownership
- Be warm but professional, ready to send as-is
- Be concise (under 300 words)

---

TRANSCRIPT (max 15 000 chars):
${transcript.slice(0, 15000)}`
}

// ---------------------------------------------------------------------------
// Client-Facing Meeting Summary Doc
// ---------------------------------------------------------------------------

export const CLIENT_DOC_SYSTEM_PROMPT = `You are a professional meeting documentation specialist.
Create polished, client-facing meeting summaries that can be shared directly
with clients and stakeholders.
Never include internal sales strategy, objection handling tactics, or
competitive intelligence. Keep the tone professional and collaborative.
Always respond in English.`

export function buildClientDocPrompt(
  transcript: string,
  meetingTitle?: string,
  meetingDate?: string,
  attendees?: string[],
  knowledgeContext?: string
): string {
  const meta = [
    meetingTitle ? `Meeting: ${meetingTitle}` : "",
    meetingDate ? `Date: ${meetingDate}` : "",
    attendees?.length ? `Attendees: ${attendees.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const kb = knowledgeContext
    ? `\nUse these team knowledge base insights for accuracy:\n${knowledgeContext}\n`
    : ""

  return `Create a professional client-facing meeting summary document.
${meta ? `\n${meta}` : ""}${kb}
Use EXACTLY these section headers:

## Meeting Overview
(Brief description of the meeting purpose and context — 2-3 sentences)

## Key Discussion Points
(Numbered list of the main topics discussed, with brief descriptions)

## Decisions Made
(Bullet list of any decisions or agreements reached during the meeting)

## Action Items
(Checklist format: "- [ ] Action — Owner — Due date if mentioned")

## Next Steps
(Clear outline of what happens next, including follow-up meetings if any)

---

TRANSCRIPT (max 15 000 chars):
${transcript.slice(0, 15000)}`
}
