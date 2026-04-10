import { NextRequest, NextResponse } from "next/server"
import { createCalendarEvent } from "@/lib/google-calendar"

/**
 * Parse date strings from GHL into format Google Calendar accepts.
 * GHL sends: "Friday, April 17, 2026 10:30 AM"
 * Google Calendar needs: "2026-04-17T10:30:00" (no Z, no ms)
 *
 * We parse the date and format as local time (YYYY-MM-DDTHH:MM:SS)
 * paired with timeZone in the Calendar API request.
 */
function parseGHLDate(dateStr: string): string {
  // If already ISO format with T, return as-is
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    return dateStr
  }

  // Remove day name prefix like "Friday, " "Tuesday, " etc.
  const cleaned = dateStr.replace(/^[A-Za-z]+,\s*/, "")

  // Parse: "April 17, 2026 10:30 AM"
  const match = cleaned.match(
    /^(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i
  )

  if (match) {
    const months: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
    }
    const monthNum = months[match[1].toLowerCase()] ?? "01"
    const day = match[2].padStart(2, "0")
    const year = match[3]
    let hour = parseInt(match[4], 10)
    const min = match[5]
    const ampm = (match[6] ?? "").toUpperCase()

    if (ampm === "PM" && hour < 12) hour += 12
    if (ampm === "AM" && hour === 12) hour = 0

    return `${year}-${monthNum}-${day}T${String(hour).padStart(2, "0")}:${min}:00`
  }

  // Fallback: try native Date parsing, strip to local format
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, "0")
    const d = String(parsed.getDate()).padStart(2, "0")
    const h = String(parsed.getHours()).padStart(2, "0")
    const min = String(parsed.getMinutes()).padStart(2, "0")
    return `${y}-${m}-${d}T${h}:${min}:00`
  }

  return dateStr
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret if configured
    const secret = process.env.GHL_WEBHOOK_SECRET
    if (secret) {
      const headerSecret = req.headers.get("x-webhook-secret") ?? req.nextUrl.searchParams.get("secret")
      if (headerSecret !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await req.json()
    lastPayload = body
    lastTimestamp = new Date().toISOString()
    lastError = null
    console.log("GHL webhook received:", JSON.stringify(body).slice(0, 1000))

    // Extract appointment data — flexible: supports nested or flat payload
    const appointment = body.appointment ?? body
    const contact = body.contact ?? {}
    const staff = body.staff ?? body.assignedUser ?? {}

    const title = appointment.title ?? appointment.summary ?? body.title ?? "Sales Meeting"
    const rawStart = appointment.startTime ?? appointment.start_time ?? appointment.start ?? body.startTime ?? body.start_time
    const rawEnd = appointment.endTime ?? appointment.end_time ?? appointment.end ?? body.endTime ?? body.end_time
    const startTime = rawStart ? parseGHLDate(String(rawStart)) : undefined
    const endTime = rawEnd ? parseGHLDate(String(rawEnd)) : undefined

    if (!startTime || !endTime) {
      console.error("GHL webhook: missing dates. Body keys:", Object.keys(body), "Appointment keys:", Object.keys(appointment))
      return NextResponse.json(
        { error: "Missing startTime or endTime", receivedKeys: Object.keys(body), appointmentKeys: Object.keys(appointment) },
        { status: 400 }
      )
    }

    // Build description with prospect and rep info
    const descriptionParts = []
    const contactName = contact.name ?? body.contactName ?? ""
    const contactEmail = contact.email ?? body.contactEmail ?? ""
    const contactPhone = contact.phone ?? body.contactPhone ?? ""
    const contactCompany = contact.company ?? contact.company_name ?? body.contactCompany ?? ""
    const staffName = staff.name ?? body.staffName ?? ""

    if (contactName) descriptionParts.push(`Prospect: ${contactName}`)
    if (contactEmail) descriptionParts.push(`Email: ${contactEmail}`)
    if (contactPhone) descriptionParts.push(`Phone: ${contactPhone}`)
    if (contactCompany) descriptionParts.push(`Company: ${contactCompany}`)
    if (staffName) descriptionParts.push(`Assigned Rep: ${staffName}`)
    descriptionParts.push(`\nBooked via Go High Level`)

    // Note: Service accounts cannot invite attendees without Domain-Wide Delegation,
    // so we include contact/staff info in the description instead.

    // Create the event in the shared Sales Team Meetings calendar
    const event = await createCalendarEvent({
      title: contactName ? `${title} - ${contactName}` : title,
      startTime,
      endTime,
      description: descriptionParts.join("\n"),
      addMeet: false,
    })

    return NextResponse.json({
      success: true,
      eventId: event.id,
      meetLink: event.hangoutLink ?? null,
      htmlLink: event.htmlLink ?? null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    lastError = message
    console.error("GHL webhook error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Store last webhook payload for debugging
let lastPayload: unknown = null
let lastError: string | null = null
let lastTimestamp: string | null = null

// GET: show last received payload (for debugging)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    lastTimestamp,
    lastError,
    lastPayload,
  })
}
