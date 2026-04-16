const APIFY_BASE_URL = "https://api.apify.com/v2"

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error("Missing APIFY_API_TOKEN")
  return token
}

export interface ApifyEnrichmentResult {
  services?: string[]
  specialties?: string[]
  providerCount?: number
  address?: string
  phone?: string
  description?: string
  raw?: Record<string, unknown>
}

/**
 * Run a website scraper Actor on Apify to enrich a lead's practice data.
 * Uses the generic "website-content-crawler" Actor.
 */
export async function enrichFromWebsite(websiteUrl: string): Promise<ApifyEnrichmentResult> {
  const token = getToken()

  // Start the Actor run
  const runRes = await fetch(
    `${APIFY_BASE_URL}/acts/apify~website-content-crawler/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: websiteUrl }],
        maxCrawlPages: 5,
        maxCrawlDepth: 1,
      }),
    }
  )

  if (!runRes.ok) {
    const text = await runRes.text()
    throw new Error(`Apify start error ${runRes.status}: ${text}`)
  }

  const run = await runRes.json()
  const runId = run.data?.id

  if (!runId) throw new Error("Apify: no run ID returned")

  // Wait for the run to finish (poll with timeout)
  const result = await waitForRun(runId, token)
  return parseEnrichmentData(result)
}

/**
 * Scrape a LinkedIn profile using Apify's LinkedIn scraper Actor.
 */
export async function scrapeLinkedIn(profileUrl: string): Promise<Record<string, unknown> | null> {
  const token = getToken()

  const runRes = await fetch(
    `${APIFY_BASE_URL}/acts/anchor~linkedin-profile-scraper/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: profileUrl }],
        proxy: { useApifyProxy: true },
      }),
    }
  )

  if (!runRes.ok) {
    // LinkedIn scraping is optional — return null on failure
    console.warn(`Apify LinkedIn scraper error: ${runRes.status}`)
    return null
  }

  const run = await runRes.json()
  const runId = run.data?.id
  if (!runId) return null

  return waitForRun(runId, token)
}

async function waitForRun(
  runId: string,
  token: string,
  maxWaitMs = 120_000
): Promise<Record<string, unknown>> {
  const start = Date.now()
  const pollInterval = 5_000

  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    )
    const statusData = await statusRes.json()
    const status = statusData.data?.status

    if (status === "SUCCEEDED") {
      // Fetch dataset items
      const datasetId = statusData.data?.defaultDatasetId
      if (!datasetId) return {}

      const itemsRes = await fetch(
        `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=10`
      )
      const items = await itemsRes.json()
      return Array.isArray(items) && items.length > 0 ? items[0] : {}
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${runId} ended with status: ${status}`)
    }

    await new Promise((r) => setTimeout(r, pollInterval))
  }

  throw new Error(`Apify run ${runId} timed out after ${maxWaitMs}ms`)
}

function parseEnrichmentData(raw: Record<string, unknown>): ApifyEnrichmentResult {
  const text = String(raw.text ?? raw.content ?? raw.body ?? "")
  const result: ApifyEnrichmentResult = { raw }

  // Extract phone numbers (US format)
  const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
  if (phoneMatch) result.phone = phoneMatch[0]

  // Extract common medical specialties
  const specialtyKeywords = [
    "family medicine", "internal medicine", "pediatrics", "ob/gyn", "obstetrics",
    "cardiology", "dermatology", "orthopedics", "psychiatry", "psychology",
    "behavioral health", "mental health", "primary care", "urgent care",
    "physical therapy", "chiropractic", "dental", "optometry", "neurology",
  ]
  const foundSpecialties = specialtyKeywords.filter((s) =>
    text.toLowerCase().includes(s)
  )
  if (foundSpecialties.length > 0) result.specialties = foundSpecialties

  // Extract services mentioned
  const serviceKeywords = [
    "telehealth", "telemedicine", "in-person", "walk-in", "appointments",
    "lab services", "imaging", "x-ray", "vaccination", "wellness",
    "preventive care", "chronic care", "weight management",
  ]
  const foundServices = serviceKeywords.filter((s) =>
    text.toLowerCase().includes(s)
  )
  if (foundServices.length > 0) result.services = foundServices

  // Try to find provider count
  const providerMatch = text.match(/(\d+)\s*(?:providers?|doctors?|physicians?|practitioners?)/i)
  if (providerMatch) result.providerCount = parseInt(providerMatch[1], 10)

  if (raw.description) result.description = String(raw.description)

  return result
}
