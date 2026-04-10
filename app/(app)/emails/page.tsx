"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Mail,
  Send,
  Loader2,
  Check,
  X,
  Edit3,
  Clock,
  Sparkles,
  Bot,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface PendingEmail {
  id: string
  to_email: string
  to_name: string | null
  subject: string
  body_text: string
  body_html: string
  status: "pending" | "sent" | "rejected"
  source: "auto" | "agent" | "manual"
  meeting_title: string | null
  meeting_date: string | null
  sent_at: string | null
  created_at: string
}

const SOURCE_BADGES: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  auto: { label: "Auto-analysis", icon: <Sparkles className="w-3 h-3" />, className: "bg-purple-100 text-purple-700" },
  agent: { label: "Agent", icon: <Bot className="w-3 h-3" />, className: "bg-teal-100 text-teal-700" },
  manual: { label: "Manual", icon: <User className="w-3 h-3" />, className: "bg-slate-100 text-slate-700" },
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<PendingEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"pending" | "sent" | "all">("pending")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState("")
  const [editBody, setEditBody] = useState("")
  const [sendingId, setSendingId] = useState<string | null>(null)

  const fetchEmails = async () => {
    try {
      const res = await fetch(`/api/emails?status=${tab}`)
      if (!res.ok) throw new Error("Failed to fetch emails")
      const data = await res.json()
      setEmails(data.emails ?? [])
    } catch {
      toast.error("Failed to load emails")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchEmails()
  }, [tab])

  const startEditing = (email: PendingEmail) => {
    setEditingId(email.id)
    setEditSubject(email.subject)
    setEditBody(email.body_text)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditSubject("")
    setEditBody("")
  }

  const saveEdit = async (emailId: string) => {
    try {
      const res = await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      })
      if (!res.ok) throw new Error("Failed to save")

      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId ? { ...e, subject: editSubject, body_text: editBody, body_html: editBody } : e
        )
      )
      cancelEditing()
      toast.success("Email updated")
    } catch {
      toast.error("Failed to save changes")
    }
  }

  const handleSend = async (email: PendingEmail) => {
    setSendingId(email.id)
    try {
      const payload: Record<string, string> = { emailId: email.id }
      // If editing, send the edited values
      if (editingId === email.id) {
        payload.subject = editSubject
        payload.body = editBody
      }

      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to send")
      }

      toast.success(`Email sent to ${email.to_email}`)
      cancelEditing()
      fetchEmails()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send email"
      toast.error(message)
    } finally {
      setSendingId(null)
    }
  }

  const handleReject = async (emailId: string) => {
    try {
      const res = await fetch(`/api/emails/${emailId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to reject")

      setEmails((prev) => prev.filter((e) => e.id !== emailId))
      toast.success("Email discarded")
    } catch {
      toast.error("Failed to discard email")
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
          <Mail className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Emails</h1>
          <p className="text-sm text-slate-500">Review, edit, and approve follow-up emails before sending.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {(["pending", "sent", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "pending" ? "Pending" : t === "sent" ? "Sent" : "All"}
          </button>
        ))}
      </div>

      {/* Email list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {tab === "pending"
              ? "No pending emails. Luna will generate follow-up emails after meeting analyses."
              : tab === "sent"
              ? "No emails sent yet."
              : "No emails found."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => {
            const isEditing = editingId === email.id
            const isSending = sendingId === email.id
            const badge = SOURCE_BADGES[email.source] ?? SOURCE_BADGES.manual

            return (
              <div
                key={email.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                      {email.status === "sent" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <Check className="w-3 h-3" />
                          Sent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      To: <span className="font-medium text-slate-700">{email.to_name ?? email.to_email}</span>
                      {email.to_name && <span className="text-slate-400"> ({email.to_email})</span>}
                    </p>
                    {email.meeting_title && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Meeting: {email.meeting_title}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(email.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Subject */}
                {isEditing ? (
                  <input
                    className="w-full text-sm font-medium border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="Subject"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800">
                    Subject: {email.subject}
                  </p>
                )}

                {/* Body */}
                {isEditing ? (
                  <textarea
                    className="w-full min-h-[160px] text-sm border border-slate-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-teal-200"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                ) : (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {email.body_text}
                    </p>
                  </div>
                )}

                {/* Actions - only for pending */}
                {email.status === "pending" && (
                  <div className="flex items-center gap-2 pt-1">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={() => saveEdit(email.id)}
                          size="sm"
                          className="gap-1.5 bg-teal-600 hover:bg-teal-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleSend(email)}
                          disabled={isSending}
                          size="sm"
                          className="gap-1.5 bg-green-600 hover:bg-green-700"
                        >
                          {isSending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Approve & Send
                        </Button>
                        <Button
                          onClick={() => startEditing(email)}
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleReject(email.id)}
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Discard
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Sent info */}
                {email.status === "sent" && email.sent_at && (
                  <p className="text-xs text-green-600">
                    Sent on {new Date(email.sent_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
