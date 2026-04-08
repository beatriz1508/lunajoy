import { NextResponse } from "next/server"
import { listCalendarEvents } from "@/lib/google-calendar"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const debug = searchParams.get("debug") === "1"

    const data = await listCalendarEvents()

    if (debug) {
      return NextResponse.json({
        calendarId: process.env.GOOGLE_CALENDAR_ID ?? "NOT SET",
        serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "NOT SET",
        hasKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        itemCount: data.items?.length ?? 0,
        summary: data.summary,
        timeZone: data.timeZone,
        items: data.items?.map((e: Record<string, unknown>) => ({
          summary: e.summary,
          start: e.start,
          status: e.status,
        })),
      })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 })
  }
}
