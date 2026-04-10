import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * PATCH /api/emails/[id]
 *
 * Edit a pending email's subject and/or body before sending.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subject, body } = await req.json()
    const updates: Record<string, string> = {}
    if (subject !== undefined) updates.subject = subject
    if (body !== undefined) {
      updates.body_html = body
      updates.body_text = body
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("pending_emails")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Email not found or not editable" }, { status: 404 })
    }

    return NextResponse.json({ success: true, email: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/emails/[id]
 *
 * Reject/discard a pending email.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("pending_emails")
      .update({ status: "rejected" })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Email not found or not pending" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
