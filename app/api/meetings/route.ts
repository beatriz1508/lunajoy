import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary"
  const now = new Date()
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    orderBy: "startTime",
    singleEvents: "true",
    maxResults: "50",
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
