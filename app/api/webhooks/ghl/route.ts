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

    // Extract appointment data — GHL webhook payload format
    const appointment = body.appointment ?? body
    const contact = body.contact ?? {}
    const staff = body.staff ?? body.assignedUser ?? {}

    const title = appointment.title ?? appointment.summary ?? "Sales Meeting"
    const startTime = appointment.startTime ?? appointment.start_time ?? appointment.start
    const endTime = appointment.endTime ?? appointment.end_time ?? appointment.end

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing startTime or endTime" },
        { status: 400 }
      )
    }

    // Build description with prospect and rep info
    const descriptionParts = []
    if (contact.name) descriptionParts.push(`Prospect: ${contact.name}`)
    if (contact.email) descriptionParts.push(`Email: ${contact.email}`)
    if (contact.phone) descriptionParts.push(`Phone: ${contact.phone}`)
    if (contact.company || contact.company_name)
      descriptionParts.push(`Company: ${contact.company ?? contact.company_name}`)
    if (staff.name) descriptionParts.push(`Assigned Rep: ${staff.name}`)
    descriptionParts.push(`\nBooked via Go High Level`)

    // Collect attendee emails
    const attendees: string[] = []
    if (contact.email) attendees.push(contact.email)
    if (staff.email) attendees.push(staff.email)

    // Create the event in the shared Sales Team Meetings calendar
    const event = await createCalendarEvent({
      title: contact.name ? `${title} - ${contact.name}` : title,
      startTime,
      endTime,
      description: descriptionParts.join("\n"),
      attendees,
      addMeet: true,
    })

    return NextResponse.json({
      success: true,
      eventId: event.id,
      meetLink: event.hangoutLink ?? null,
      htmlLink: event.htmlLink ?? null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("GHL webhook error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
