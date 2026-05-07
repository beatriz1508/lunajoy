# Sales AI — Handoff Document

**Repository:** https://github.com/beatriz1508/lunajoy  
**Deploy:** Vercel (project `sales-ai`)  
**Stack:** Next.js 14 · Supabase · OpenAI · GoHighLevel · Apify · Hunter.io

---

## What this project is

An internal AI platform for the LunaJoy sales team. The goal is to speed up the sales consultant's work at every stage of the cycle — from prospecting leads to writing emails and preparing meetings.

---

## Features

| Module | What it does |
|---|---|
| **Copilot** | AI chat with access to the knowledge base and lead history |
| **Emails** | Generates personalized outreach emails per clinic and sends via Gmail |
| **Leads** | Scrapes clinics from Google Maps (via Apify), enriches with data and emails, and pushes to GHL |
| **Meetings** | Generates meeting prep documents with clinic context |
| **Brainstorm** | AI assistant for sales ideas and strategies |
| **Training** | Gamified training sessions with XP and levels |
| **Knowledge** | Shared knowledge base (objections, playbooks, talking points) |
| **Playbook / GHL Playbook** | Sales process reference and GHL call workflow handbook |
| **History** | Session and activity history per consultant |

---

## Separate automation — Gmail BCC → GHL

In addition to the main app, there is an automation in `lunajoy-gmail-ghl-sync/` that runs via **n8n**:

When a consultant sends a cold outreach email to a new clinic and adds the automation inbox to BCC, the system:
1. Detects the incoming email
2. Checks if the contact already exists in GHL
3. If not, creates the contact and logs the email as a conversation in GHL

This solves the problem where the native GHL connector only works for contacts that already exist in the CRM.

---

## External integrations

| Service | Purpose |
|---|---|
| **Supabase** | Database and authentication (Google OAuth) |
| **OpenAI** | Text generation, semantic search, lead enrichment |
| **GoHighLevel (GHL)** | CRM — leads are created and managed here |
| **Apify** | Google Maps clinic scraping |
| **Hunter.io** | Email discovery by domain |
| **Google Service Account** | Gmail sending and Google Calendar access |
| **n8n** | Workflow automation (Gmail BCC → GHL) |

---

## How to set up from scratch

1. Clone the repo: `git clone https://github.com/beatriz1508/lunajoy.git`
2. Install dependencies: `npm install`
3. Copy env vars: `cp .env.local.example .env.local` and fill in your credentials
4. Create the database: run `supabase/schema.sql` in the Supabase SQL Editor
5. Run locally: `npm run dev`
6. To deploy: import the repo on Vercel (vercel.com/new) and add the environment variables

The `.env.local.example` file lists all required variables and where to get each one.

The [README.md](README.md) in the repository has the full step-by-step guide.

---

## Important notes

- Login is via **Google OAuth** (Supabase Auth) — only authorized emails can sign in
- Email sending uses a **Google Service Account** with domain-wide delegation — not user OAuth
- The GHL Private Integration Token expires — if the integration stops working, generate a new one at GHL → Settings → Integrations
- This project was built with **Claude Code** (Anthropic's AI) and can be continued the same way
