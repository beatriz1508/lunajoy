const GHL_BASE_URL = "https://services.leadconnectorhq.com"

function getConfig() {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!apiKey) throw new Error("Missing GHL_API_KEY")
  if (!locationId) throw new Error("Missing GHL_LOCATION_ID")
  return { apiKey, locationId }
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  }
}

export interface GHLContactData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  companyName?: string
  website?: string
  address1?: string
  city?: string
  state?: string
  source?: string
  tags?: string[]
  customFields?: Array<{ id: string; value: string }>
}

export interface GHLContact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  tags?: string[]
}

/**
 * Create a new contact in GHL.
 */
export async function createContact(data: GHLContactData): Promise<GHLContact> {
  const { apiKey, locationId } = getConfig()

  const res = await fetch(`${GHL_BASE_URL}/contacts/`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      ...data,
      locationId,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL create contact error ${res.status}: ${text}`)
  }

  const result = await res.json()
  return result.contact
}

/**
 * Search for an existing contact by email to prevent duplicates.
 */
export async function findContactByEmail(email: string): Promise<GHLContact | null> {
  const { apiKey, locationId } = getConfig()

  const res = await fetch(
    `${GHL_BASE_URL}/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: headers(apiKey),
    }
  )

  if (!res.ok) {
    if (res.status === 404) return null
    const text = await res.text()
    throw new Error(`GHL search error ${res.status}: ${text}`)
  }

  const result = await res.json()
  return result.contact ?? null
}

/**
 * Add tags to an existing contact.
 */
export async function addTags(contactId: string, tags: string[]): Promise<void> {
  const { apiKey } = getConfig()

  const res = await fetch(`${GHL_BASE_URL}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ tags }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL add tags error ${res.status}: ${text}`)
  }
}

/**
 * Add a contact to a specific workflow in GHL.
 */
export async function addToWorkflow(contactId: string, workflowId: string): Promise<void> {
  const { apiKey } = getConfig()

  const res = await fetch(
    `${GHL_BASE_URL}/contacts/${contactId}/workflow/${workflowId}`,
    {
      method: "POST",
      headers: headers(apiKey),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL add to workflow error ${res.status}: ${text}`)
  }
}

/**
 * Update an existing contact with new data.
 */
export async function updateContact(
  contactId: string,
  data: Partial<GHLContactData>
): Promise<GHLContact> {
  const { apiKey } = getConfig()

  const res = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
    method: "PUT",
    headers: headers(apiKey),
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL update contact error ${res.status}: ${text}`)
  }

  const result = await res.json()
  return result.contact
}
