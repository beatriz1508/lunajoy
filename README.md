# Sales AI — LunaJoy Internal Tool

AI-powered platform for the LunaJoy sales team. Handles lead generation, email writing, meeting prep, and a sales copilot — all in one internal web app.

**Live site:** deployed on Vercel  
**Code:** https://github.com/beatriz1508/lunajoy  
**Stack:** Next.js 14 · Supabase · OpenAI · GoHighLevel (GHL) · Apify · Hunter.io

---

## What the app does

| Page | What it's for |
|---|---|
| `/` (Dashboard) | Overview / home |
| `/copilot` | AI chat agent with access to knowledge base and leads |
| `/emails` | Generate and send personalized outreach emails |
| `/leads` | Scrape + enrich leads from Google Maps via Apify, push to GHL |
| `/meetings` | Generate meeting prep docs from context |
| `/brainstorm` | AI brainstorming assistant |
| `/training` | Gamified training sessions with XP and levels |
| `/knowledge` | Shared knowledge base (objections, playbooks, etc.) |
| `/history` | Session history |
| `/playbook` | Sales playbook reference |
| `/ghl-playbook` | GHL call workflow handbook |
| `/bhi` | Public-facing page (no auth required) |

There is also a separate automation in `/lunajoy-gmail-ghl-sync` — see its own [README](lunajoy-gmail-ghl-sync/README.md).

---

## Running locally

### 1. Clone and install

```bash
git clone https://github.com/beatriz1508/lunajoy.git
cd lunajoy
npm install
```

### 2. Set up environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Then fill in all values — see the [Environment Variables](#environment-variables) section below.

### 3. Set up the database

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
4. Copy the project URL and keys into `.env.local`

### 4. Run the dev server

```bash
npm run dev
```

App will be at http://localhost:3000.

---

## Environment Variables

All variables go in `.env.local` for local dev, and in Vercel for production.

| Variable | Where to get it | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Yes |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) → API Keys | Yes |
| `GHL_API_KEY` | GoHighLevel → Settings → Integrations → Private Integrations | Yes |
| `GHL_LOCATION_ID` | GHL → Settings → Business Info → Location ID | Yes |
| `APIFY_API_TOKEN` | [console.apify.com](https://console.apify.com) → Settings → Integrations | Yes |
| `HUNTER_API_KEY` | [hunter.io](https://hunter.io) → Dashboard → API | Yes |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud → IAM → Service Accounts | For meetings/calendar |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Google Cloud → Service Account → Keys → JSON | For meetings/calendar |
| `GOOGLE_CALENDAR_ID` | Google Calendar → Settings → Calendar ID | For meetings/calendar |
| `GOOGLE_GMAIL_USER_EMAIL` | The Gmail account used for sending | For email sending |
| `N8N_WEBHOOK_API_KEY` | n8n webhook settings | For n8n automations |

> **Note:** The old `.env.local.example` only had `GOOGLE_GENERATIVE_AI_API_KEY`. That key is no longer used — the app uses `OPENAI_API_KEY` instead. Do not add the Google Generative AI key.

---

## Deploying to Vercel

The project is already linked to Vercel under the `sales-ai` project (org: LunaJoy team).

### Option A — Transfer ownership (recommended if staying on same Vercel team)

1. The current owner needs to transfer the project in Vercel dashboard → Settings → Transfer Project
2. The new owner accepts the transfer
3. All env vars and deployment history are preserved

### Option B — Fresh deploy from GitHub

If you need to create a new Vercel project from scratch:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import from `https://github.com/beatriz1508/lunajoy`
3. Framework: **Next.js** (auto-detected)
4. Add all environment variables from the table above
5. Deploy

The `.vercel/project.json` file links this repo to the existing Vercel project. If deploying to a new project, you can delete that file — Vercel will create a new one.

### Updating the site after code changes

```bash
# Push to main branch → Vercel auto-deploys
git add .
git commit -m "your change"
git push origin main
```

Vercel is connected to the GitHub repo and deploys automatically on every push to `main`.

---

## Project structure

```
app/
  (app)/          # All authenticated pages
  api/            # API routes (backend logic lives here)
    agent/        # AI copilot chat endpoint
    emails/       # Email generation and sending
    leads/        # Lead scraping (Apify) and GHL push
    analyze/      # AI analysis endpoint
    brainstorm/   # Brainstorm AI
    generate-email/
    generate-meeting-doc/
    webhooks/ghl/ # GHL webhook receiver
  auth/           # Supabase auth callbacks
  bhi/            # Public page
  login/          # Login page
components/       # Shared React components
lib/              # Shared backend logic
  apify.ts        # Apify Google Maps scraper
  ghl.ts          # GoHighLevel API client
  gmail.ts        # Gmail sending via Google Service Account
  google-calendar.ts
  hunter.ts       # Hunter.io email lookup
  knowledge.ts    # Knowledge base queries
  storage.ts      # File storage helpers
  utils.ts
  db/             # Supabase query helpers
  prompts/        # AI system prompts
supabase/
  schema.sql      # Full database schema — run this to set up DB
  migrations/     # Individual migration files
lunajoy-gmail-ghl-sync/   # Separate n8n automation (see its README)
```

---

## Authentication

Login is handled by **Supabase Auth** with Google OAuth. To add new users:

1. Go to Supabase dashboard → Authentication → Users
2. Users sign in with their Google account at `/login`
3. Only users from your configured domain can log in (controlled by Supabase settings)

To restrict to specific email domains, go to Supabase → Authentication → Settings → Restrict signups.

---

## Database

Schema is in [`supabase/schema.sql`](supabase/schema.sql). Main tables:

| Table | Purpose |
|---|---|
| `profiles` | One per user — stores name, XP, level |
| `knowledge_entries` | Shared sales knowledge (objections, playbooks) |
| `email_drafts` | Saved email drafts |
| `training_sessions` | Training session history and scores |
| `leads` | Scraped lead records |

Row Level Security (RLS) is enabled — users can only see their own data unless the table is explicitly shared.

---

## Gmail / Google Service Account setup

The app sends emails on behalf of a Gmail account using a Google Service Account (not OAuth). This requires:

1. A Google Cloud project with Gmail API enabled
2. A Service Account with domain-wide delegation
3. The service account must be granted access to impersonate the Gmail user in Google Workspace Admin

If email sending breaks, the most common cause is an expired or revoked service account key. Regenerate the key in Google Cloud → IAM → Service Accounts → Keys, and update `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` in Vercel.

---

## GHL (GoHighLevel) integration

The app reads and writes to GHL via the Private Integration API. Key things:

- Leads scraped by Apify get pushed to GHL as contacts
- The webhook at `/api/webhooks/ghl` receives GHL events
- The `lunajoy-gmail-ghl-sync` automation (n8n) runs separately and creates contacts when reps BCC the automation inbox

If the GHL integration stops working, check that the Private Integration Token hasn't expired in GHL → Settings → Integrations.

---

## Making changes with Claude Code (AI assistant)

This project was built using [Claude Code](https://claude.ai/code). To continue developing with it:

1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. Open the project folder: `claude`
3. Describe what you want to change in plain English

The AI has full context of the codebase and can make changes, debug issues, and add features.

---

## Common tasks

**Add a new page:**  
Create `app/(app)/your-page/page.tsx`. It will automatically be protected by auth.

**Add a new API endpoint:**  
Create `app/api/your-endpoint/route.ts`. Export `GET`, `POST`, etc.

**Update AI prompts:**  
Edit files in `lib/prompts/`.

**Add to the knowledge base:**  
Use the `/knowledge` page in the app, or insert directly into the `knowledge_entries` Supabase table.

**Run database migrations:**  
Add a new `.sql` file in `supabase/migrations/` and run it in the Supabase SQL Editor.
