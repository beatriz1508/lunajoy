import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/emails/check?meeting_title=...
 *
 * Check if a pending follow-up email already exists for a given meeting.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const meetingTitle = searchParams.get("meeting_title")

    if (!meetingTitle) {
      return NextResponse.json({ error: "meeting_title is required" }, { status: 400 })
    }

    const { data } = await supabase
      .from("pending_emails")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("meeting_title", meetingTitle)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      return NextResponse.json({ exists: true, emailId: data.id })
    }

    return NextResponse.json({ exists: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
