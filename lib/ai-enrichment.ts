import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

const EnrichmentSchema = z.object({
  emails: z.array(
    z.object({
      value: z.string().describe("The email address"),
      type: z.enum(["generic", "personal"]).describe(
        "generic = info@/office@/contact@, personal = named individual's email"
      ),
      contactName: z.string().nullable().describe("Name of person if this is a personal email"),
      title: z.string().nullable().describe("Job title of the person if known"),
    })
  ).describe("All email addresses found, including obfuscated ones like 'info [at] clinic.com'"),

  ehrSystem: z.enum([
    "Athena", "Epic", "Cerner", "AllScripts", "eClinicalWorks",
    "NextGen", "Kareo", "Practice Fusion", "Other", "Unknown"
  ]).describe("The EHR/EMR system the practice uses, if mentioned"),

  decisionMakers: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      email: z.string().nullable(),
    })
  ).describe("Practice managers, office managers, medical directors, owners"),

  providerCount: z.number().nullable().describe("Number of providers/doctors/physicians"),

  specialties: z.array(z.string()).describe(
    "Medical specialties (e.g., nephrology, dialysis, family medicine)"
  ),

  services: z.array(z.string()).describe(
    "Services offered (e.g., telehealth, in-person, home dialysis)"
  ),

  practiceSize: z.enum(["small", "medium", "large", "enterprise"]).describe(
    "small = 1-5 providers, medium = 6-20, large = 21-100, enterprise = 100+"
  ),

  acceptsInsurance: z.array(z.string()).describe(
    "Insurance providers accepted (e.g., Medicare, BCBS, Aetna)"
  ),

  description: z.string().describe("Brief 1-sentence description of the practice"),
})

export type AIEnrichment = z.infer<typeof EnrichmentSchema>

/**
 * Use OpenAI to extract structured lead data from website HTML/text.
 * Much smarter than regex — handles obfuscated emails, identifies EHR systems,
 * finds decision makers, etc.
 */
export async function enrichWithAI(params: {
  practiceName: string
  websiteContent: string
  maxContentLength?: number
}): Promise<AIEnrichment> {
  const { practiceName, websiteContent } = params
  const maxLen = params.maxContentLength ?? 20_000

  // Truncate content to stay within token limits
  const content = websiteContent.slice(0, maxLen)

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: EnrichmentSchema,
    system: `You are a lead research assistant for LunaJoy, a behavioral health integration (BHI) service for medical practices. You extract structured contact and practice information from website content.

CRITICAL:
- Look for emails even when obfuscated (e.g., "info [at] clinic dot com" → "info@clinic.com")
- Identify EHR system mentions (Athena is especially important — LunaJoy integrates with Athena)
- Find decision makers: Practice Manager, Office Manager, Medical Director, Owner, Clinical Director
- Return null/empty arrays when information isn't available — do NOT hallucinate
- Extract emails from mailto: links, JSON-LD, contact forms, and visible text`,
    prompt: `Extract structured information from this medical practice website.

Practice: ${practiceName}

Website content:
${content}`,
  })

  return object
}

/**
 * Use OpenAI with web_search tool to find emails for a practice on the open web.
 * Called as a fallback when AI extraction from website didn't find emails
 * and Hunter.io has no data.
 */
export async function searchEmailOnWeb(params: {
  practiceName: string
  website?: string
  city?: string
  state?: string
}): Promise<{ emails: string[]; contactName?: string; title?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY")

  const locationHint = [params.city, params.state].filter(Boolean).join(", ")
  const websiteHint = params.website ? ` (${params.website})` : ""

  const prompt = `Find contact email addresses for "${params.practiceName}"${websiteHint}${locationHint ? ` located in ${locationHint}` : ""}, a medical practice in the United States.

Search for:
- Office manager, practice manager, or practice administrator email
- General contact email (info@, office@, contact@)
- Any email on their website, LinkedIn, healthcare directories, or Google Business profile

Respond ONLY with valid JSON matching this exact schema:
{
  "emails": ["email1@domain.com", "email2@domain.com"],
  "contactName": "full name if found, null otherwise",
  "title": "job title if found, null otherwise"
}

Return empty emails array if no legitimate emails found. Do not guess or fabricate.`

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI web search error ${res.status}: ${text}`)
  }

  const data = await res.json()

  // Extract the text output from the response
  let outputText = ""
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === "output_text" && typeof c.text === "string") {
            outputText += c.text
          }
        }
      }
    }
  }
  if (!outputText && data.output_text) outputText = data.output_text

  // Parse JSON from response (may have markdown fences)
  const jsonMatch = outputText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { emails: [] }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      emails: Array.isArray(parsed.emails) ? parsed.emails : [],
      contactName: parsed.contactName ?? undefined,
      title: parsed.title ?? undefined,
    }
  } catch {
    return { emails: [] }
  }
}
