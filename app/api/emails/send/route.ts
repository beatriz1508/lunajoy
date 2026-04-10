import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/gmail"

/**
 * POST /api/emails/send
 *
 * Approve and send a pending email via Gmail API.
 * Body: { emailId, subject?, body? }
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailId, subject, body } = await req.json()

    if (!emailId) {
      return NextResponse.json({ error: "Missing emailId" }, { status: 400 })
    }

    // Fetch the pending email
    const { data: email, error: fetchError } = await supabase
      .from("pending_emails")
      .select("*")
      .eq("id", emailId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    if (email.status !== "pending") {
      return NextResponse.json({ error: "Email is not pending" }, { status: 400 })
    }

    // Use edited values if provided
    const finalSubject = subject ?? email.subject
    const finalBody = body ?? email.body_text

    // Send via Gmail
    const result = await sendEmail({
      to: email.to_email,
      subject: finalSubject,
      bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${finalBody.replace(/\n/g, "<br>")}</div>`,
      bodyText: finalBody,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Update email status
    await supabase
      .from("pending_emails")
      .update({
        status: "sent",
        subject: finalSubject,
        body_html: finalBody,
        body_text: finalBody,
        approved_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        gmail_message_id: result.messageId ?? null,
      })
      .eq("id", emailId)

    // Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "email_sent",
      title: `Email sent to ${email.to_email}`,
      body: `Your follow-up email "${finalSubject}" has been sent.`,
      link: `/emails`,
    })

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
