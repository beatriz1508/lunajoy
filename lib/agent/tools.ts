import { tool } from "ai"
import type { ToolSet } from "ai"
import { z } from "zod"
import { createCalendarEvent, listCalendarEvents } from "@/lib/google-calendar"
import { createClient } from "@/lib/supabase/server"

/**
 * Agent tools — functions the LLM can call autonomously.
 * Each tool has a description (used by the LLM to decide when to call it),
 * parameters (validated with zod), and an execute function.
 */
export function createAgentTools(): ToolSet {
  return {
    /**
     * Search the knowledge base for relevant sales insights.
     */
    searchKnowledge: tool({
      description:
        "Search the team knowledge base for sales insights, objection handling techniques, " +
        "competitive positioning, and best practices. Use this when you need expert guidance " +
        "on how to handle specific situations, objections, or industries.",
      inputSchema: z.object({
        query: z.string().describe("What to search for (e.g. 'price objection', 'healthcare industry', 'closing techniques')"),
      }),
      execute: async ({ query }) => {
        const supabase = createClient()
        const { data } = await supabase
          .from("knowledge_entries")
          .select("*")
          .order("created_at", { ascending: false })

        if (!data?.length) return { results: [], message: "No knowledge base entries found." }

        // Simple keyword matching (can upgrade to vector search later)
        const queryLower = query.toLowerCase()
        const keywords = queryLower.split(/\s+/)

        const scored = data.map((entry) => {
          const text = `${entry.title} ${entry.content} ${entry.tag_industry ?? ""} ${entry.tag_deal_stage ?? ""} ${entry.tag_objection ?? ""}`.toLowerCase()
          const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0)
          return { ...entry, score }
        })

        const relevant = scored.filter((e) => e.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)

        if (relevant.length === 0) {
          return { results: [], message: `No knowledge entries matched "${query}".` }
        }

        return {
          results: relevant.map((e) => ({
            title: e.title,
            content: e.content,
            tags: [e.tag_industry, e.tag_deal_stage, e.tag_objection].filter(Boolean),
          })),
        }
      },
    }),

    /**
     * List upcoming and recent meetings from the shared Google Calendar.
     */
    listMeetings: tool({
      description:
        "List upcoming and recent sales meetings from the shared Sales Team calendar. " +
        "Use this to find meetings by date, prospect name, or to see what's scheduled.",
      inputSchema: z.object({
        filter: z.enum(["all", "past", "upcoming"]).optional().describe("Filter by past, upcoming, or all meetings"),
      }),
      execute: async ({ filter }) => {
        const data = await listCalendarEvents()
        const events = (data.items ?? []).filter(
          (e: Record<string, unknown>) => (e as { status?: string }).status !== "cancelled"
        )

        const now = new Date()
        const filtered = events.filter((e: Record<string, unknown>) => {
          const start = (e as { start?: { dateTime?: string; date?: string } }).start
          const startStr = start?.dateTime ?? start?.date ?? ""
          const eventDate = new Date(startStr)
          if (filter === "past") return eventDate < now
          if (filter === "upcoming") return eventDate >= now
          return true
        })

        return {
          count: filtered.length,
          meetings: filtered.slice(0, 10).map((e: Record<string, unknown>) => {
            const event = e as {
              summary?: string
              start?: { dateTime?: string; date?: string }
              end?: { dateTime?: string; date?: string }
              description?: string
              attendees?: Array<{ email: string; displayName?: string }>
              hangoutLink?: string
            }
            return {
              title: event.summary ?? "Untitled",
              start: event.start?.dateTime ?? event.start?.date ?? "",
              end: event.end?.dateTime ?? event.end?.date ?? "",
              description: event.description?.slice(0, 200) ?? "",
              attendees: event.attendees?.map((a) => a.displayName ?? a.email) ?? [],
              meetLink: event.hangoutLink ?? null,
            }
          }),
        }
      },
    }),

    /**
     * Create a new event in the shared Sales Team Meetings calendar.
     */
    createMeeting: tool({
      description:
        "Create a new meeting in the Sales Team Meetings Google Calendar. " +
        "Use this when the user asks to schedule a meeting or follow-up call.",
      inputSchema: z.object({
        title: z.string().describe("Meeting title"),
        startTime: z.string().describe("Start time in ISO 8601 format (e.g. 2026-04-15T10:00:00)"),
        endTime: z.string().describe("End time in ISO 8601 format"),
        description: z.string().optional().describe("Meeting description or notes"),
      }),
      execute: async ({ title, startTime, endTime, description }) => {
        const event = await createCalendarEvent({
          title,
          startTime,
          endTime,
          description,
          addMeet: false,
        })
        return {
          success: true,
          eventId: event.id,
          htmlLink: event.htmlLink ?? null,
          message: `Meeting "${title}" created successfully.`,
        }
      },
    }),

    /**
     * Search the user's analysis history for past meeting analyses.
     */
    searchHistory: tool({
      description:
        "Search the user's past analyses, brainstorm sessions, and training results. " +
        "Use this to find previous interactions with a specific prospect or topic.",
      inputSchema: z.object({
        query: z.string().describe("Search term (prospect name, topic, etc.)"),
        type: z.enum(["copilot", "brainstorm", "training", "all"]).optional().describe("Filter by type"),
      }),
      execute: async ({ query, type }) => {
        const supabase = createClient()
        let queryBuilder = supabase
          .from("history_entries")
          .select("*")
          .order("created_at", { ascending: false })

        if (type && type !== "all") {
          queryBuilder = queryBuilder.eq("type", type)
        }

        const { data } = await queryBuilder

        if (!data?.length) return { results: [], message: "No history entries found." }

        const queryLower = query.toLowerCase()
        const keywords = queryLower.split(/\s+/)

        const matched = data.filter((entry) => {
          const text = `${entry.title} ${entry.summary} ${entry.full_content}`.toLowerCase()
          return keywords.some((kw) => text.includes(kw))
        }).slice(0, 5)

        return {
          results: matched.map((e) => ({
            type: e.type,
            title: e.title,
            summary: e.summary,
            score: e.score,
            date: e.created_at,
            fullContent: e.full_content?.slice(0, 500) ?? "",
          })),
        }
      },
    }),

    /**
     * Save a new insight to the team knowledge base.
     */
    saveInsight: tool({
      description:
        "Save a new sales insight or best practice to the team knowledge base. " +
        "Use this when you discover a valuable technique from a meeting analysis " +
        "or when the user asks to save something for the team.",
      inputSchema: z.object({
        title: z.string().describe("Short title for the insight"),
        content: z.string().describe("Detailed content of the insight"),
        industry: z.string().optional().describe("Industry tag (e.g. 'healthcare', 'fintech')"),
        dealStage: z.string().optional().describe("Deal stage tag (e.g. 'discovery', 'negotiation')"),
        objection: z.string().optional().describe("Objection type tag (e.g. 'price', 'timing')"),
      }),
      execute: async ({ title, content, industry, dealStage, objection }) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
          .from("knowledge_entries")
          .insert({
            title,
            content,
            tag_industry: industry ?? null,
            tag_deal_stage: dealStage ?? null,
            tag_objection: objection ?? null,
            created_by: user?.id ?? null,
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }
        return { success: true, id: data.id, message: `Insight "${title}" saved to knowledge base.` }
      },
    }),

    /**
     * Analyze a meeting transcript and return structured insights.
     */
    analyzeTranscript: tool({
      description:
        "Analyze a sales meeting transcript to extract key insights. " +
        "Returns executive summary, objections raised, handling strategies, " +
        "follow-up actions, and an email draft. Use this when the user provides " +
        "or asks you to analyze a meeting transcript.",
      inputSchema: z.object({
        transcript: z.string().describe("The full meeting transcript text"),
      }),
      execute: async ({ transcript }) => {
        // This tool returns the transcript for the LLM to analyze inline
        // rather than making a separate API call (the agent IS the LLM)
        return {
          transcript: transcript.slice(0, 15000),
          instruction: "Now analyze this transcript. Provide: Executive Summary, Key Objections, Objection Handling, Follow-Up Actions, and Follow-Up Email Draft.",
        }
      },
    }),

    /**
     * Draft a follow-up email for rep approval before sending.
     */
    draftEmail: tool({
      description:
        "Save a follow-up email draft for the sales rep to review and approve before sending. " +
        "Use this when you generate a follow-up email from a meeting analysis or when the user asks you to draft an email. " +
        "The email will NOT be sent immediately — it goes to the Emails page for approval.",
      inputSchema: z.object({
        toEmail: z.string().describe("Recipient email address"),
        toName: z.string().optional().describe("Recipient name"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Email body text (plain text)"),
        meetingTitle: z.string().optional().describe("Related meeting title for context"),
      }),
      execute: async ({ toEmail, toName, subject, body, meetingTitle }) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Not authenticated" }

        const { data, error } = await supabase
          .from("pending_emails")
          .insert({
            user_id: user.id,
            to_email: toEmail,
            to_name: toName ?? null,
            subject,
            body_html: body,
            body_text: body,
            meeting_title: meetingTitle ?? null,
            source: "agent",
            status: "pending",
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }
        return {
          success: true,
          id: data.id,
          message: `Email draft saved for approval. The rep can review and send it from the Emails page.`,
        }
      },
    }),

    /**
     * Generate a meeting prep/brainstorm for an upcoming prospect meeting.
     */
    prepMeeting: tool({
      description:
        "Generate a consultant-level meeting preparation for an upcoming prospect meeting. " +
        "Provides likely objections, counter-arguments, discovery questions, and competitive positioning. " +
        "Use this when the user has an upcoming meeting and wants to prepare.",
      inputSchema: z.object({
        prospectName: z.string().describe("Prospect or company name"),
        industry: z.string().describe("Industry of the prospect"),
        dealStage: z.string().optional().describe("Current deal stage (e.g. discovery, demo, negotiation)"),
        challenges: z.string().optional().describe("Known challenges or context about the prospect"),
      }),
      execute: async ({ prospectName, industry, dealStage, challenges }) => {
        return {
          prospect: prospectName,
          industry,
          dealStage: dealStage ?? "unknown",
          challenges: challenges ?? "none specified",
          instruction: `Generate a consultant-level meeting prep for ${prospectName} (${industry}). Include: Likely Objections, Counter-Arguments, Discovery Questions, and Competitive Positioning.`,
        }
      },
    }),
  }
}
