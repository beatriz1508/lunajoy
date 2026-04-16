const APIFY_BASE_URL = "https://api.apify.com/v2"

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error("Missing APIFY_API_TOKEN")
  return token
}

// ─── Types ───────────────────────────────────────────────────────

export interface GoogleMapsSearchFilters {
  searchTerms: string[]
  locationQuery?: string
  maxResults?: number
  language?: string
  zoom?: number
}

export interface GoogleMapsPlace {
  title: string
  categoryName?: string
  address?: string
  street?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
  website?: string
  url?: string
  totalScore?: number
  reviewsCount?: number
  email?: string
}

export interface WebsiteEnrichment {
  emails: string[]
  phones: string[]
  services: string[]
  specialties: string[]
  providerCount?: number
  description?: string
}

export interface ScrapedLead {
  practiceName: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
  website?: string
  googleMapsUrl?: string
  rating?: number
  reviewsCount?: number
  category?: string
  // From website enrichment
  emails: string[]
  contactName?: string
  services: string[]
  specialties: string[]
  providerCount?: number
  description?: string
}

// ─── Google Maps Scraper ─────────────────────────────────────────

/**
 * Search Google Maps for medical practices using Apify's Google Maps Scraper.
 * This is the primary lead source — replaces Apollo.
 */
export async function searchGoogleMaps(
  filters: GoogleMapsSearchFilters
): Promise<GoogleMapsPlace[]> {
  const token = getToken()

  const input = {
    searchStringsArray: filters.searchTerms,
    locationQuery: filters.locationQuery,
    maxCrawledPlacesPerSearch: filters.maxResults ?? 20,
    language: filters.language ?? "en",
    deeperCityScrape: false,
    onePerDomain: false,
  }

  const runRes = await fetch(
    `${APIFY_BASE_URL}/acts/compass~crawler-google-places/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )

  if (!runRes.ok) {
    const text = await runRes.text()
    throw new Error(`Apify Google Maps start error ${runRes.status}: ${text}`)
  }

  const run = await runRes.json()
  const runId = run.data?.id
  if (!runId) throw new Error("Apify Google Maps: no run ID returned")

  const items = await waitForRunItems(runId, token, 180_000)
  return items as GoogleMapsPlace[]
}

// ─── Website Enrichment ──────────────────────────────────────────

/**
 * Scrape a practice's website to extract emails, phones, services, and specialties.
 */
export async function enrichFromWebsite(websiteUrl: string): Promise<WebsiteEnrichment> {
  const token = getToken()

  // Normalize base URL
  const baseUrl = websiteUrl.replace(/\/+$/, "")

  // Crawl main site + key pages where emails are typically found
  const startUrls = [
    { url: baseUrl },
    { url: `${baseUrl}/contact` },
    { url: `${baseUrl}/contact-us` },
    { url: `${baseUrl}/about` },
    { url: `${baseUrl}/about-us` },
    { url: `${baseUrl}/our-team` },
    { url: `${baseUrl}/providers` },
    { url: `${baseUrl}/staff` },
  ]

  const runRes = await fetch(
    `${APIFY_BASE_URL}/acts/apify~website-content-crawler/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls,
        maxCrawlPages: 15,
        maxCrawlDepth: 2,
        // Include link hrefs so we can capture mailto: links
        saveHtml: true,
      }),
    }
  )

  if (!runRes.ok) {
    const text = await runRes.text()
    throw new Error(`Apify website crawler error ${runRes.status}: ${text}`)
  }

  const run = await runRes.json()
  const runId = run.data?.id
  if (!runId) throw new Error("Apify website crawler: no run ID returned")

  const items = await waitForRunItems(runId, token, 180_000)

  // Combine text + HTML from all crawled pages for maximum extraction
  const allText = items
    .map((item: Record<string, unknown>) => String(item.text ?? item.content ?? item.body ?? ""))
    .join("\n")

  const allHtml = items
    .map((item: Record<string, unknown>) => String(item.html ?? ""))
    .join("\n")

  return parseWebsiteContent(allText, allHtml)
}

// ─── Full Pipeline: Maps + Website ──────────────────────────────

/**
 * Full scraping pipeline: Google Maps search → website enrichment for each result.
 * Returns enriched leads ready for GHL.
 */
export async function scrapeLeads(
  filters: GoogleMapsSearchFilters,
  options: { skipWebsiteEnrichment?: boolean } = {}
): Promise<ScrapedLead[]> {
  // Step 1: Search Google Maps
  const places = await searchGoogleMaps(filters)

  // Step 2: Enrich each place with website data
  const leads: ScrapedLead[] = []

  for (const place of places) {
    const lead: ScrapedLead = {
      practiceName: place.title,
      address: place.address,
      city: place.city,
      state: place.state,
      zipCode: place.zipCode,
      phone: place.phone,
      website: place.website,
      googleMapsUrl: place.url,
      rating: place.totalScore,
      reviewsCount: place.reviewsCount,
      category: place.categoryName,
      emails: [],
      services: [],
      specialties: [],
    }

    // Enrich from website if available
    if (!options.skipWebsiteEnrichment && place.website) {
      try {
        const enrichment = await enrichFromWebsite(place.website)
        lead.emails = enrichment.emails
        lead.services = enrichment.services
        lead.specialties = enrichment.specialties
        lead.providerCount = enrichment.providerCount
        lead.description = enrichment.description
      } catch (err) {
        // Website enrichment is best-effort
        console.warn(`Website enrichment failed for ${place.title}:`, err)
      }
    }

    leads.push(lead)
  }

  return leads
}

// ─── Helpers ─────────────────────────────────────────────────────

async function waitForRunItems(
  runId: string,
  token: string,
  maxWaitMs: number
): Promise<Array<Record<string, unknown>>> {
  const start = Date.now()
  const pollInterval = 5_000

  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    )
    const statusData = await statusRes.json()
    const status = statusData.data?.status

    if (status === "SUCCEEDED") {
      const datasetId = statusData.data?.defaultDatasetId
      if (!datasetId) return []

      const itemsRes = await fetch(
        `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=100`
      )
      return itemsRes.json()
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${runId} ended with status: ${status}`)
    }

    await new Promise((r) => setTimeout(r, pollInterval))
  }

  throw new Error(`Apify run ${runId} timed out after ${maxWaitMs}ms`)
}

function parseWebsiteContent(text: string, html: string = ""): WebsiteEnrichment {
  const result: WebsiteEnrichment = {
    emails: [],
    phones: [],
    services: [],
    specialties: [],
  }

  // ── Extract emails from multiple sources ──

  const allEmails = new Set<string>()

  // 1. From visible text
  const textEmailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
  if (textEmailMatches) textEmailMatches.forEach((e) => allEmails.add(e.toLowerCase()))

  // 2. From mailto: links in HTML
  const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)
  if (mailtoMatches) {
    mailtoMatches.forEach((m) => {
      const email = m.replace(/^mailto:/i, "").split("?")[0].toLowerCase()
      allEmails.add(email)
    })
  }

  // 3. From href attributes containing @ (some sites obfuscate emails in links)
  const hrefEmailMatches = html.match(/href=["'][^"']*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[^"']*?["']/gi)
  if (hrefEmailMatches) {
    hrefEmailMatches.forEach((m) => {
      const emailMatch = m.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (emailMatch) allEmails.add(emailMatch[1].toLowerCase())
    })
  }

  // 4. From HTML content attributes, meta tags, JSON-LD structured data
  const metaEmailMatches = html.match(/content=["'][^"']*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[^"']*?["']/gi)
  if (metaEmailMatches) {
    metaEmailMatches.forEach((m) => {
      const emailMatch = m.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (emailMatch) allEmails.add(emailMatch[1].toLowerCase())
    })
  }

  // 5. From JSON-LD / schema.org structured data
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  if (jsonLdMatches) {
    jsonLdMatches.forEach((block) => {
      const emailsInBlock = block.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
      if (emailsInBlock) emailsInBlock.forEach((e) => allEmails.add(e.toLowerCase()))
    })
  }

  // Filter out junk emails
  const junkPatterns = [
    "example", "sentry", "wixpress", "wordpress", "noreply", "no-reply",
    "donotreply", "unsubscribe", "test@", "info@sentry", ".png", ".jpg",
    "webpack", "localhost", "schema.org",
  ]
  result.emails = [...allEmails].filter(
    (e) => !junkPatterns.some((p) => e.includes(p))
  )

  // Prioritize: office/info/contact emails first, then personal
  result.emails.sort((a, b) => {
    const priorityPrefixes = ["info@", "office@", "contact@", "admin@", "reception@", "front"]
    const aScore = priorityPrefixes.findIndex((p) => a.startsWith(p))
    const bScore = priorityPrefixes.findIndex((p) => b.startsWith(p))
    if (aScore >= 0 && bScore < 0) return -1
    if (bScore >= 0 && aScore < 0) return 1
    return 0
  })

  // ── Extract phone numbers (US format) ──
  const phoneMatches = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g)
  if (phoneMatches) {
    result.phones = [...new Set(phoneMatches)]
  }

  // ── Extract medical specialties ──
  const specialtyKeywords = [
    "family medicine", "internal medicine", "pediatrics", "ob/gyn", "obstetrics",
    "cardiology", "dermatology", "orthopedics", "psychiatry", "psychology",
    "behavioral health", "mental health", "primary care", "urgent care",
    "physical therapy", "chiropractic", "dental", "optometry", "neurology",
    "endocrinology", "gastroenterology", "pulmonology", "rheumatology",
  ]
  result.specialties = specialtyKeywords.filter((s) => text.toLowerCase().includes(s))

  // ── Extract services ──
  const serviceKeywords = [
    "telehealth", "telemedicine", "in-person", "walk-in", "appointments",
    "lab services", "imaging", "x-ray", "vaccination", "wellness",
    "preventive care", "chronic care", "weight management", "annual physical",
    "sick visits", "women's health", "men's health",
  ]
  result.services = serviceKeywords.filter((s) => text.toLowerCase().includes(s))

  // ── Provider count ──
  const providerMatch = text.match(/(\d+)\s*(?:providers?|doctors?|physicians?|practitioners?)/i)
  if (providerMatch) result.providerCount = parseInt(providerMatch[1], 10)

  // ── Description ──
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 50)
  if (paragraphs.length > 0) {
    result.description = paragraphs[0].trim().slice(0, 300)
  }

  return result
}
