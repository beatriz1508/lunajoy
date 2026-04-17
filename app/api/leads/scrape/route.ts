import { NextRequest, NextResponse } from "next/server"
import { validateWebhookKey, unauthorizedResponse } from "@/lib/auth/webhook"
import { scrapeLeads, type ScrapedLead } from "@/lib/apify"
import { createContact, findContactByEmail, addToWorkflow } from "@/lib/ghl"
import { createAdminClient } from "@/lib/supabase/admin"

interface ScrapeRequest {
  searchTerms?: string[]
  locationQuery?: string
  maxResults?: number
  skipWebsiteEnrichment?: boolean
  workflowId?: string
  tags?: string[]
}

export async function POST(req: NextRequest) {
  if (!validateWebhookKey(req)) return unauthorizedResponse()

  const startTime = Date.now()
  const body: ScrapeRequest = await req.json()

  const results = {
    created: [] as string[],
    duplicates: [] as string[],
    skippedNoEmail: [] as string[],
    errors: [] as Array<{ name: string; error: string }>,
    totalFound: 0,
  }

  try {
    // 1. Scrape Google Maps + enrich websites via Apify
    const leads = await scrapeLeads(
      {
        searchTerms: body.searchTerms ?? [
          "medical practice",
          "family medicine clinic",
          "primary care physician",
        ],
        locationQuery: body.locationQuery,
        maxResults: body.maxResults ?? 20,
      },
      { skipWebsiteEnrichment: body.skipWebsiteEnrichment }
    )

    results.totalFound = leads.length

    // 2. Process each lead → push to GHL
    for (const lead of leads) {
      try {
        await processLead(lead, body, results)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.errors.push({ name: lead.practiceName, error: msg })
      }
    }

    // 3. Log to Supabase
    await logAutomationRun(results, startTime)

    return NextResponse.json({
      success: true,
      summary: {
        totalFound: results.totalFound,
        created: results.created.length,
        duplicates: results.duplicates.length,
        skippedNoEmail: results.skippedNoEmail.length,
        errors: results.errors.length,
      },
      details: results,
      durationMs: Date.now() - startTime,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await logAutomationRun(results, startTime, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function processLead(
  lead: ScrapedLead,
  options: ScrapeRequest,
  results: {
    created: string[]
    duplicates: string[]
    skippedNoEmail: string[]
    errors: Array<{ name: string; error: string }>
  }
) {
  // Use the first email found from website enrichment, or phone as fallback identifier
  const email = lead.emails[0]

  if (!email) {
    // No email — still push to GHL if we have a phone number
    if (!lead.phone) {
      results.skippedNoEmail.push(lead.practiceName)
      return
    }
  }

  // Check for duplicates by email or phone
  if (email) {
    const existing = await findContactByEmail(email)
    if (existing) {
      results.duplicates.push(email)
      return
    }
  }
  if (lead.phone) {
    const { findContactByPhone } = await import("@/lib/ghl")
    const existing = await findContactByPhone(lead.phone)
    if (existing) {
      results.duplicates.push(lead.phone)
      return
    }
  }

  // Build custom fields
  const customFields: Array<{ id: string; value: string }> = []
  if (lead.specialties.length) {
    customFields.push({ id: "specialties", value: lead.specialties.join(", ") })
  }
  if (lead.services.length) {
    customFields.push({ id: "services", value: lead.services.join(", ") })
  }
  if (lead.providerCount) {
    customFields.push({ id: "provider_count", value: String(lead.providerCount) })
  }
  if (lead.googleMapsUrl) {
    customFields.push({ id: "google_maps_url", value: lead.googleMapsUrl })
  }
  if (lead.rating) {
    customFields.push({ id: "google_rating", value: String(lead.rating) })
  }
  if (lead.category) {
    customFields.push({ id: "practice_type", value: lead.category })
  }
  if (lead.ehrSystem) {
    customFields.push({ id: "ehr_system", value: lead.ehrSystem })
  }
  if (lead.practiceSize) {
    customFields.push({ id: "practice_size", value: lead.practiceSize })
  }
  if (lead.acceptsInsurance?.length) {
    customFields.push({ id: "accepts_insurance", value: lead.acceptsInsurance.join(", ") })
  }
  if (lead.contactTitle) {
    customFields.push({ id: "contact_title", value: lead.contactTitle })
  }
  if (lead.description) {
    customFields.push({ id: "ai_description", value: lead.description })
  }
  if (lead.decisionMakers?.length) {
    const dmSummary = lead.decisionMakers
      .map((d) => `${d.name} (${d.title})${d.email ? ` - ${d.email}` : ""}`)
      .join("; ")
    customFields.push({ id: "decision_makers", value: dmSummary })
  }

  // Auto-tag with EHR system if found (makes Athena leads easy to filter)
  const ehrTag = lead.ehrSystem ? `ehr-${lead.ehrSystem.toLowerCase()}` : null

  const tags = [
    "apify-lead",
    "medical-practice",
    "auto-scraped",
    ...(ehrTag ? [ehrTag] : []),
    ...(options.tags ?? []),
  ]

  // Use decision maker's name if available, otherwise practice name
  const [firstName, ...restName] = lead.contactName
    ? lead.contactName.split(" ")
    : [lead.practiceName]
  const lastName = restName.join(" ")

  // Create contact in GHL
  const contact = await createContact({
    firstName,
    lastName,
    ...(email ? { email } : {}),
    phone: lead.phone,
    companyName: lead.practiceName,
    website: lead.website,
    address1: lead.address,
    city: lead.city,
    state: lead.state,
    source: "apify-google-maps",
    tags,
    customFields: customFields.length > 0 ? customFields : undefined,
  })

  if (contact?.id && options.workflowId) {
    await addToWorkflow(contact.id, options.workflowId)
  }

  results.created.push(email ?? lead.practiceName)
}

async function logAutomationRun(
  results: {
    created: string[]
    duplicates: string[]
    skippedNoEmail: string[]
    errors: Array<{ name: string; error: string }>
  },
  startTime: number,
  fatalError?: string
) {
  try {
    const supabase = createAdminClient()
    await supabase.from("automation_runs").insert({
      type: "lead-scraping",
      status: fatalError ? "error" : "success",
      result: {
        created: results.created.length,
        duplicates: results.duplicates.length,
        skippedNoEmail: results.skippedNoEmail.length,
        errors: results.errors.length,
        errorDetails: results.errors,
        fatalError,
      },
      duration_ms: Date.now() - startTime,
    })
  } catch (err) {
    console.error("Failed to log automation run:", err)
  }
}

// GET: health check
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "lead-scraping" })
}
