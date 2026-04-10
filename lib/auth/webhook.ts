/**
 * Validate the x-api-key header for n8n webhook requests.
 */
export function validateWebhookKey(req: Request): boolean {
  const key = req.headers.get("x-api-key")
  return !!key && key === process.env.N8N_WEBHOOK_API_KEY
}

/**
 * Returns a 401 Response for unauthorized webhook requests.
 */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  )
}
