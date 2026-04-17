import { NextRequest, NextResponse } from "next/server"
import { validateWebhookKey, unauthorizedResponse } from "@/lib/auth/webhook"

const APIFY_BASE_URL = "https://api.apify.com/v2"

/**
 * Debug endpoint: runs the Contact Info Scraper on a URL and returns raw results.
 */
export async function POST(req: NextRequest) {
  if (!validateWebhookKey(req)) return unauthorizedResponse()

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 })

  const token = process.env.APIFY_API_TOKEN
  if (!token) return NextResponse.json({ error: "Missing APIFY_API_TOKEN" }, { status: 500 })

  // Run Website Content Crawler with HTML to see raw content
  const runRes = await fetch(
    `${APIFY_BASE_URL}/acts/apify~website-content-crawler/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [
          { url },
          { url: `${url}/contact` },
          { url: `${url}/contact-us` },
          { url: `${url}/about` },
        ],
        maxCrawlPages: 10,
        maxCrawlDepth: 2,
        saveHtml: true,
      }),
    }
  )

  if (!runRes.ok) {
    const text = await runRes.text()
    return NextResponse.json({ error: `Apify error: ${text}` }, { status: runRes.status })
  }

  const run = await runRes.json()
  const runId = run.data?.id

  // Poll for completion
  const start = Date.now()
  while (Date.now() - start < 120_000) {
    const statusRes = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`)
    const statusData = await statusRes.json()
    const status = statusData.data?.status

    if (status === "SUCCEEDED") {
      const datasetId = statusData.data?.defaultDatasetId
      const itemsRes = await fetch(
        `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=50`
      )
      const items = await itemsRes.json()
      return NextResponse.json({
        success: true,
        url,
        itemCount: items.length,
        rawItems: items,
      })
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      return NextResponse.json({ error: `Run ended: ${status}` }, { status: 500 })
    }

    await new Promise((r) => setTimeout(r, 5000))
  }

  return NextResponse.json({ error: "Timeout" }, { status: 504 })
}
