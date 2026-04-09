import { NextRequest, NextResponse } from "next/server"
import { createCalendarEvent } from "@/lib/google-calendar"

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
    const startTime = appointment.startTime ?? appointment.start_time ?? appointment.start ?? body.startTime ?? body.start_time
    const endTime = appointment.endTime ?? appointment.end_time ?? appointment.end ?? body.endTime ?? body.end_time

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
