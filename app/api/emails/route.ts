import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/emails?status=pending|sent|all
 *
 * List pending/sent emails for the current user.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? "all"

    let query = supabase
      .from("pending_emails")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (status === "pending") {
      query = query.eq("status", "pending")
    } else if (status === "sent") {
      query = query.eq("status", "sent")
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ emails: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
