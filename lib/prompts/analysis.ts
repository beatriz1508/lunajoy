/**
 * Shared prompts for transcript analysis.
 * Used by both the manual /api/analyze route and the automated n8n post-meeting webhook.
 */

export const ANALYSIS_SYSTEM_PROMPT = `You are an expert B2B sales consultant with 15+ years experience.
Your role is to help sales reps become consultants — not just pitch features,
but diagnose problems, challenge assumptions, and build business cases.
Always respond in the same language the user is writing in.`

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
 */
export function extractEmailDraft(analysisText: string): { subject: string; body: string } | null {
  const emailMatch = analysisText.match(/## Follow-Up Email Draft\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  if (!emailMatch) return null

  const emailContent = emailMatch[1].trim()
  const subjectMatch = emailContent.match(/Subject:\s*(.+)/i)
  const subject = subjectMatch ? subjectMatch[1].trim() : "Follow-up"
  const body = emailContent
    .replace(/Subject:\s*.+\n?/i, "")
    .trim()

  if (!body) return null
  return { subject, body }
}

export const PREP_SYSTEM_PROMPT = `You are an expert B2B sales consultant with 15+ years experience.
Generate a consultant-level meeting preparation. Be specific and actionable.
Always respond in the same language the user is writing in.`

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
