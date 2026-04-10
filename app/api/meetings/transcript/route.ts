import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get("fileId")
  const title = searchParams.get("title") ?? ""
  const date = searchParams.get("date") ?? ""

  // If we have a specific file ID, export its content directly
  if (fileId) {
    const exportRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!exportRes.ok) {
      return NextResponse.json({ error: "Failed to export file" }, { status: 400 })
    }
    const text = await exportRes.text()
    return NextResponse.json({ transcript: text })
  }

  // Search Drive for a transcript matching the meeting title and date
  const dateStart = date
    ? new Date(date).toISOString().split("T")[0]
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  // Google Meet saves transcripts with "Transcript" in the name
  const shortTitle = title.replace(/['"\\]/g, "").slice(0, 40)
  const query = `(name contains 'Transcript' or name contains 'transcript') and createdTime >= '${dateStart}T00:00:00' and trashed = false`

  const searchParams2 = new URLSearchParams({
    q: query,
    fields: "files(id,name,createdTime,webViewLink,mimeType)",
    orderBy: "createdTime desc",
    pageSize: "20",
  })

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?${searchParams2}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!searchRes.ok) {
    return NextResponse.json({ error: "Drive search failed" }, { status: 400 })
  }

  const searchData = await searchRes.json()

  // Try to find the best match by title similarity
  const files: Array<{ id: string; name: string; createdTime: string; webViewLink: string; mimeType: string }> =
    searchData.files ?? []

  const titleWords = shortTitle.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
  const scored = files.map((f) => {
    const nameLower = f.name.toLowerCase()
    const score = titleWords.reduce((acc: number, word: string) => acc + (nameLower.includes(word) ? 1 : 0), 0)
    return { ...f, score }
  })
  scored.sort((a, b) => b.score - a.score)

  return NextResponse.json({ files: scored })
}
