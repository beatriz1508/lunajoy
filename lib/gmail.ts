import { GoogleAuth } from "google-auth-library"

/**
 * Gmail API integration using service account with Domain-Wide Delegation.
 * Follows the same pattern as lib/google-calendar.ts.
 *
 * Requirements:
 * - Gmail API enabled in GCP project
 * - Service account has Domain-Wide Delegation
 * - Google Workspace admin granted gmail.send scope to the service account
 */

function parsePrivateKey(raw: string): string {
  let key = raw.replace(/\\n/g, "\n")
  key = key.replace(/^["']|["']$/g, "")
  if (!key.includes("-----BEGIN")) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----\n`
  }
  return key
}

function getGmailAuth(impersonateEmail: string) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!email || !rawKey) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")
  }

  const key = parsePrivateKey(rawKey)

  return new GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    clientOptions: { subject: impersonateEmail },
  })
}

async function getGmailAccessToken(impersonateEmail: string): Promise<string> {
  const auth = getGmailAuth(impersonateEmail)
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (!token.token) throw new Error("Failed to get Gmail access token")
  return token.token
}

/**
 * Build an RFC 2822 email message and base64url-encode it for the Gmail API.
 */
function buildRawEmail(params: {
  from: string
  to: string
  subject: string
  bodyHtml: string
  bodyText: string
}): string {
  const boundary = `boundary_${Date.now()}`
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(params.bodyText, "utf-8").toString("base64"),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(params.bodyHtml, "utf-8").toString("base64"),
    ``,
    `--${boundary}--`,
  ]

  const raw = lines.join("\r\n")
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export interface SendEmailParams {
  to: string
  subject: string
  bodyHtml: string
  bodyText: string
  fromEmail?: string // defaults to GOOGLE_GMAIL_USER_EMAIL
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email via Gmail API using Domain-Wide Delegation.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const fromEmail = params.fromEmail ?? process.env.GOOGLE_GMAIL_USER_EMAIL

  if (!fromEmail) {
    throw new Error("Missing GOOGLE_GMAIL_USER_EMAIL or fromEmail parameter")
  }

  try {
    const token = await getGmailAccessToken(fromEmail)

    const raw = buildRawEmail({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      bodyHtml: params.bodyHtml,
      bodyText: params.bodyText,
    })

    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    )

    if (!res.ok) {
      const err = await res.json()
      return { success: false, error: `Gmail API error: ${JSON.stringify(err)}` }
    }

    const data = await res.json()
    return { success: true, messageId: data.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}
