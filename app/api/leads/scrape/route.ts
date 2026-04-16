import { NextRequest, NextResponse } from "next/server"
import { validateWebhookKey, unauthorizedResponse } from "@/lib/auth/webhook"
import { searchLeads, type ApolloPerson } from "@/lib/apollo"
import { enrichFromWebsite } from "@/lib/apify"
import { createContact, findContactByEmail, addTags } from "@/lib/ghl"
import { createAdminClient } from "@/lib/supabase/admin"

interface ScrapeRequest {
  personTitles?: string[]
  organizationIndustries?: string[]
  personLocations?: string[]
  employeeRanges?: string[]
  perPage?: number
  page?: number
  skipEnrichment?: boolean
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
    errors: [] as Array<{ email: string; error: string }>,
    totalFound: 0,
  }

  try {
    // 1. Search Apollo for leads
    const apolloResult = await searchLeads({
      personTitles: body.personTitles ?? [
        "Practice Manager",
        "Office Manager",
        "Medical Director",
        "Practice Administrator",
        "Clinic Manager",
        "Operations Director",
      ],
      organizationIndustries: body.organizationIndustries,
      personLocations: body.personLocations,
      employeeRanges: body.employeeRanges ?? ["1,10", "11,50", "51,200"],
      perPage: body.perPage ?? 25,
      page: body.page ?? 1,
    })

    results.totalFound = apolloResult.pagination.total_entries
    const leads = apolloResult.people

    // 2. Process each lead
    for (const person of leads) {
      try {
        await processLead(person, body, results)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.errors.push({
          email: person.email ?? person.id,
          error: msg,
        })
      }
    }

    // 3. Log to Supabase
    await logAutomationRun(results, startTime)

    return NextResponse.json({
      success: true,
      summary: {
        totalFound: results.totalFound,
        processed: leads.length,
        created: results.created.length,
        duplicates: results.duplicates.length,
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
  person: ApolloPerson,
  options: ScrapeRequest,
  results: { created: string[]; duplicates: string[]; errors: Array<{ email: string; error: string }> }
) {
  if (!person.email) {
    results.errors.push({ email: person.id, error: "No email found" })
    return
  }

  // Check for duplicates in GHL
  const existing = await findContactByEmail(person.email)
  if (existing) {
    results.duplicates.push(person.email)
    return
  }

  // Enrich via Apify (optional)
  let enrichment: { services?: string[]; specialties?: string[]; providerCount?: number } = {}
  if (!options.skipEnrichment && person.organization?.website_url) {
    try {
      enrichment = await enrichFromWebsite(person.organization.website_url)
    } catch (err) {
      // Enrichment is best-effort — continue without it
      console.warn(`Enrichment failed for ${person.email}:`, err)
    }
  }

  // Build custom fields from enrichment
  const customFields: Array<{ id: string; value: string }> = []
  if (enrichment.specialties?.length) {
    customFields.push({ id: "specialties", value: enrichment.specialties.join(", ") })
  }
  if (enrichment.services?.length) {
    customFields.push({ id: "services", value: enrichment.services.join(", ") })
  }
  if (enrichment.providerCount) {
    customFields.push({ id: "provider_count", value: String(enrichment.providerCount) })
  }
  if (person.linkedin_url) {
    customFields.push({ id: "linkedin_url", value: person.linkedin_url })
  }

  // Create contact in GHL
  const tags = [
    "apollo-lead",
    "medical-practice",
    "auto-scraped",
    ...(options.tags ?? []),
  ]

  const contact = await createContact({
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.email,
    phone: person.phone_numbers?.[0]?.raw_number,
    companyName: person.organization?.name,
    website: person.organization?.website_url ?? undefined,
    city: person.city ?? undefined,
    state: person.state ?? undefined,
    source: "apollo-apify-automation",
    tags,
    customFields: customFields.length > 0 ? customFields : undefined,
  })

  // Add extra tags if contact was created successfully
  if (contact?.id && options.workflowId) {
    const { addToWorkflow } = await import("@/lib/ghl")
    await addToWorkflow(contact.id, options.workflowId)
  }

  results.created.push(person.email)
}

async function logAutomationRun(
  results: { created: string[]; duplicates: string[]; errors: Array<{ email: string; error: string }> },
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
