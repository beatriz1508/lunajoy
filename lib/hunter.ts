const HUNTER_BASE_URL = "https://api.hunter.io/v2"

function getApiKey(): string {
  const key = process.env.HUNTER_API_KEY
  if (!key) throw new Error("Missing HUNTER_API_KEY")
  return key
}

export interface HunterEmail {
  value: string
  type: "personal" | "generic"
  confidence: number
  firstName: string | null
  lastName: string | null
  position: string | null
  department: string | null
}

export interface HunterDomainResult {
  domain: string
  organization: string | null
  pattern: string | null
  emails: HunterEmail[]
  totalResults: number
}

/**
 * Search for emails associated with a domain using Hunter.io Domain Search.
 */
export async function findEmailsByDomain(
  domain: string,
  options: { limit?: number; type?: "personal" | "generic"; department?: string } = {}
): Promise<HunterDomainResult> {
  const apiKey = getApiKey()

  const params = new URLSearchParams({
    domain,
    api_key: apiKey,
    limit: String(options.limit ?? 5),
  })
  if (options.type) params.set("type", options.type)
  if (options.department) params.set("department", options.department)

  const res = await fetch(`${HUNTER_BASE_URL}/domain-search?${params}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Hunter API error ${res.status}: ${text}`)
  }

  const json = await res.json()
  const data = json.data

  return {
    domain: data.domain,
    organization: data.organization,
    pattern: data.pattern,
    totalResults: json.meta?.results ?? 0,
    emails: (data.emails ?? []).map((e: Record<string, unknown>) => ({
      value: e.value,
      type: e.type,
      confidence: e.confidence,
      firstName: e.first_name ?? null,
      lastName: e.last_name ?? null,
      position: e.position ?? null,
      department: e.department ?? null,
    })),
  }
}

/**
 * Extract domain from a website URL.
 */
export function extractDomain(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0]
  }
}
