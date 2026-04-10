import { NextResponse } from "next/server"
import { listCalendarEvents } from "@/lib/google-calendar"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await listCalendarEvents()
    const res = NextResponse.json(data)
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return res
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
