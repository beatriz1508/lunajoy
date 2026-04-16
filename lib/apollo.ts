const APOLLO_BASE_URL = "https://api.apollo.io/v1"

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY
  if (!key) throw new Error("Missing APOLLO_API_KEY")
  return key
}

export interface ApolloSearchFilters {
  personTitles?: string[]
  organizationIndustries?: string[]
  personLocations?: string[]
  employeeRanges?: string[]
  perPage?: number
  page?: number
}

export interface ApolloPerson {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone_numbers?: Array<{ raw_number: string }>
  title: string | null
  linkedin_url: string | null
  city: string | null
  state: string | null
  country: string | null
  organization?: {
    name: string
    website_url: string | null
    industry: string | null
    estimated_num_employees: number | null
  }
}

export interface ApolloSearchResult {
  people: ApolloPerson[]
  pagination: {
    page: number
    per_page: number
    total_entries: number
    total_pages: number
  }
}

/**
 * Search for leads using Apollo People Search API.
 * Filters for medical practices by default.
 */
export async function searchLeads(filters: ApolloSearchFilters): Promise<ApolloSearchResult> {
  const apiKey = getApiKey()

  const body: Record<string, unknown> = {
    api_key: apiKey,
    page: filters.page ?? 1,
    per_page: filters.perPage ?? 25,
  }

  if (filters.personTitles?.length) {
    body.person_titles = filters.personTitles
  }
  if (filters.organizationIndustries?.length) {
    body.organization_industry_tag_ids = filters.organizationIndustries
  }
  if (filters.personLocations?.length) {
    body.person_locations = filters.personLocations
  }
  if (filters.employeeRanges?.length) {
    body.organization_num_employees_ranges = filters.employeeRanges
  }

  const res = await fetch(`${APOLLO_BASE_URL}/mixed_people/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apollo API error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Get full details for a specific person by Apollo ID.
 */
export async function getPersonDetails(personId: string): Promise<ApolloPerson> {
  const apiKey = getApiKey()

  const res = await fetch(`${APOLLO_BASE_URL}/people/${personId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apollo API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.person
}
