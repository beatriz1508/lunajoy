import { NextRequest, NextResponse } from "next/server"
import { validateWebhookKey, unauthorizedResponse } from "@/lib/auth/webhook"
import { createContact, findContactByEmail, addTags, type GHLContactData } from "@/lib/ghl"

/**
 * Push a single lead to GHL. Useful for manual pushes or reprocessing.
 */
export async function POST(req: NextRequest) {
  if (!validateWebhookKey(req)) return unauthorizedResponse()

  try {
    const body: GHLContactData & { skipDuplicateCheck?: boolean } = await req.json()

    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check for duplicates unless explicitly skipped
    if (!body.skipDuplicateCheck) {
      const existing = await findContactByEmail(body.email)
      if (existing) {
        return NextResponse.json({
          success: false,
          reason: "duplicate",
          existingContact: existing,
        })
      }
    }

    const contact = await createContact({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      companyName: body.companyName,
      website: body.website,
      city: body.city,
      state: body.state,
      source: body.source ?? "manual-push",
      tags: body.tags ?? ["manual-lead"],
      customFields: body.customFields,
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
