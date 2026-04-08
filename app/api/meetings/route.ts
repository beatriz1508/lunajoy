import { NextResponse } from "next/server"
import { listCalendarEvents } from "@/lib/google-calendar"

export async function GET() {
  try {
    const data = await listCalendarEvents()
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
