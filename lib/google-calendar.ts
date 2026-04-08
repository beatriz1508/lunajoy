import { GoogleAuth } from "google-auth-library"

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!email || !key) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")
  }

  return new GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  })
}

function getCalendarId() {
  const id = process.env.GOOGLE_CALENDAR_ID
  if (!id) throw new Error("Missing GOOGLE_CALENDAR_ID")
  return id
}

async function getAccessToken() {
  const auth = getAuth()
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token
}

const CALENDAR_API = "https://www.googleapis.com/calendar/v3"

export async function createCalendarEvent(params: {
  title: string
  startTime: string
  endTime: string
  description?: string
  attendees?: string[]
  addMeet?: boolean
}) {
  const token = await getAccessToken()
  const calendarId = getCalendarId()

  const event: Record<string, unknown> = {
    summary: params.title,
    start: { dateTime: params.startTime },
    end: { dateTime: params.endTime },
    description: params.description ?? "",
  }

  if (params.attendees?.length) {
    event.attendees = params.attendees.map((email) => ({ email }))
  }

  if (params.addMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: `ghl-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    }
  }

  const url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events` +
    (params.addMeet ? "?conferenceDataVersion=1" : "")

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Calendar API error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export async function listCalendarEvents(params?: {
  timeMin?: string
  timeMax?: string
  maxResults?: number
}) {
  const token = await getAccessToken()
  const calendarId = getCalendarId()

  const now = new Date()
  const searchParams = new URLSearchParams({
    timeMin: params?.timeMin ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: params?.timeMax ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    orderBy: "startTime",
    singleEvents: "true",
    maxResults: String(params?.maxResults ?? 50),
  })

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${searchParams}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Calendar API error: ${JSON.stringify(err)}`)
  }

  return res.json()
}
