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
  emails?: string[]
  contactInfo?: { emails?: string[]; phones?: string[] }
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
  contactTitle?: string
  services: string[]
  specialties: string[]
  providerCount?: number
  description?: string
  // AI-extracted fields
  ehrSystem?: string
  practiceSize?: string
  acceptsInsurance?: string[]
  decisionMakers?: Array<{ name: string; title: string; email: string | null }>
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

  return items as unknown as GoogleMapsPlace[]
}

// ─── Website Enrichment (Apify Crawler + Direct HTTP Fallback) ────

/**
 * Scrape a practice's website and return raw content.
 * Uses direct fetch first (fast, ~1-2s). Falls back to Apify only if
 * direct fetch returns too little content (JS-heavy sites).
 */
export async function crawlWebsite(websiteUrl: string): Promise<{ text: string; html: string }> {
  const baseUrl = websiteUrl.replace(/\/+$/, "")

  // Primary: direct fetch in parallel (fast)
  const pagesToFetch = [
    baseUrl,
    `${baseUrl}/contact`,
    `${baseUrl}/contact-us`,
    `${baseUrl}/about`,
    `${baseUrl}/about-us`,
    `${baseUrl}/our-team`,
    `${baseUrl}/providers`,
    `${baseUrl}/services`,
  ]

  const results = await Promise.allSettled(pagesToFetch.map(fetchPage))

  let allHtml = ""
  let allText = ""

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      allHtml += result.value.html + "\n"
      allText += result.value.text + "\n"
    }
  }

  // If direct fetch got enough content, return immediately
  if (allText.length > 500) {
    return { text: allText, html: allHtml }
  }

  // Fallback: Apify for JS-heavy sites
  try {
    const apifyResult = await crawlWithApify(baseUrl)
    if (apifyResult.text.length > allText.length) return apifyResult
  } catch (err) {
    console.warn("Apify crawler fallback failed:", err)
  }

  return { text: allText, html: allHtml }
}

async function crawlWithApify(url: string): Promise<{ text: string; html: string }> {
  const token = getToken()

  const runRes = await fetch(
    `${APIFY_BASE_URL}/acts/apify~website-content-crawler/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [
          { url },
          { url: `${url}/contact` },
          { url: `${url}/about` },
          { url: `${url}/our-team` },
        ],
        maxCrawlPages: 8,
        maxCrawlDepth: 1,
        saveHtml: true,
      }),
    }
  )

  if (!runRes.ok) {
    throw new Error(`Apify crawler start failed: ${runRes.status}`)
  }

  const run = await runRes.json()
  const runId = run.data?.id
  if (!runId) throw new Error("No run ID")

  const items = await waitForRunItems(runId, token, 45_000)

  const text = items
    .map((i: Record<string, unknown>) => String(i.text ?? i.markdown ?? i.content ?? ""))
    .join("\n\n")
  const html = items
    .map((i: Record<string, unknown>) => String(i.html ?? ""))
    .join("\n")

  return { text, html }
}

async function fetchPage(url: string): Promise<{ html: string; text: string } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LunaJoyBot/1.0; +https://lunajoy.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })

    clearTimeout(timeout)

    if (!res.ok) return null

    const html = await res.text()
    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")

    return { html, text }
  } catch {
    return null
  }
}

/**
 * Legacy: regex-based parsing. Still used as an absolute fallback if AI fails.
 */
export async function enrichFromWebsite(websiteUrl: string): Promise<WebsiteEnrichment> {
  const { text, html } = await crawlWebsite(websiteUrl)
  return parseWebsiteContent(text, html)
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

  // Step 2: Enrich each place IN PARALLEL (batched for API rate limits)
  const BATCH_SIZE = 5
  const leads: ScrapedLead[] = []

  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    const batch = places.slice(i, i + BATCH_SIZE)
    const batchLeads = await Promise.all(batch.map((place) => enrichPlace(place, options)))
    leads.push(...batchLeads)
  }

  return leads
}

async function enrichPlace(
  place: GoogleMapsPlace,
  options: { skipWebsiteEnrichment?: boolean }
): Promise<ScrapedLead> {
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

    if (place.website && !options.skipWebsiteEnrichment) {
      // Step 2a: Crawl website (Apify with fallback to direct fetch)
      let websiteContent = { text: "", html: "" }
      try {
        websiteContent = await crawlWebsite(place.website)
      } catch (err) {
        console.warn(`Website crawl failed for ${place.title}:`, err)
      }

      // Step 2b: AI extraction (OpenAI) — primary enrichment path
      if (websiteContent.text.length > 200) {
        try {
          const { enrichWithAI } = await import("@/lib/ai-enrichment")
          const ai = await enrichWithAI({
            practiceName: place.title,
            websiteContent: websiteContent.text,
          })

          lead.emails = ai.emails.map((e) => e.value.toLowerCase())
          lead.services = ai.services
          lead.specialties = ai.specialties
          lead.providerCount = ai.providerCount ?? undefined
          lead.description = ai.description
          lead.ehrSystem = ai.ehrSystem !== "Unknown" ? ai.ehrSystem : undefined
          lead.practiceSize = ai.practiceSize
          lead.acceptsInsurance = ai.acceptsInsurance
          lead.decisionMakers = ai.decisionMakers

          // Pick the best contact: personal email first, then decision maker
          const personalEmail = ai.emails.find((e) => e.type === "personal" && e.contactName)
          if (personalEmail) {
            lead.contactName = personalEmail.contactName ?? undefined
            lead.contactTitle = personalEmail.title ?? undefined
          } else if (ai.decisionMakers.length > 0) {
            const dm = ai.decisionMakers[0]
            lead.contactName = dm.name
            lead.contactTitle = dm.title
            if (dm.email && !lead.emails.includes(dm.email.toLowerCase())) {
              lead.emails.unshift(dm.email.toLowerCase())
            }
          }
        } catch (err) {
          console.warn(`AI enrichment failed for ${place.title}:`, err)
          // Fallback to regex parser
          const fallback = parseWebsiteContent(websiteContent.text, websiteContent.html)
          lead.emails = fallback.emails
          lead.services = fallback.services
          lead.specialties = fallback.specialties
        }
      }

      // Step 2c: Hunter.io as fallback if still no emails
      if (lead.emails.length === 0) {
        try {
          const { findEmailsByDomain, extractDomain } = await import("@/lib/hunter")
          const domain = extractDomain(place.website)
          const hunterResult = await findEmailsByDomain(domain, { limit: 3 })
          if (hunterResult.emails.length > 0) {
            lead.emails = hunterResult.emails.map((e) => e.value.toLowerCase())
            const firstPerson = hunterResult.emails.find((e) => e.firstName)
            if (firstPerson && !lead.contactName) {
              lead.contactName = [firstPerson.firstName, firstPerson.lastName]
                .filter(Boolean).join(" ")
              lead.contactTitle = firstPerson.position ?? undefined
            }
          }
        } catch (err) {
          console.warn(`Hunter.io fallback failed for ${place.title}:`, err)
        }
      }

      // Step 2d: OpenAI web search as final fallback — searches open web for emails
      if (lead.emails.length === 0) {
        try {
          const { searchEmailOnWeb } = await import("@/lib/ai-enrichment")
          const webResult = await searchEmailOnWeb({
            practiceName: place.title,
            website: place.website,
            city: place.city,
            state: place.state,
          })
          if (webResult.emails.length > 0) {
            lead.emails = webResult.emails.map((e) => e.toLowerCase())
            if (webResult.contactName && !lead.contactName) {
              lead.contactName = webResult.contactName
              lead.contactTitle = webResult.title
            }
          }
        } catch (err) {
          console.warn(`OpenAI web search fallback failed for ${place.title}:`, err)
        }
      }
    }

  return lead
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
