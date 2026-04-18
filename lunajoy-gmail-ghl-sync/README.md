# LunaJoy — Gmail BCC → GHL Auto-Contact

## What this does

Sales reps at LunaJoy use Gmail + GoHighLevel (GHL). The native Gmail↔GHL connector syncs email threads — but only when the contact already exists in GHL. Cold outreach to new clinics is invisible to the CRM.

This automation closes that gap. Reps BCC (or forward) a dedicated inbox when emailing a new clinic. The workflow parses the email, checks GHL for an existing contact, and **only if none exists** creates the contact and logs the email as a conversation message. The native connector keeps handling everything else.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full flow diagram.

Quick summary:

```
Gmail Trigger → Parse Email (Code) → IF skip? → GHL lookup → IF exists?
                                          │         │            │
                                          ▼         ▼            ▼
                                       skip log  create contact → create message → success log
                                                                         │
                                                                    error log (on any HTTP failure)
```

## Repo layout

| File/dir              | What it is |
| --------------------- | ---------- |
| `workflow.json`       | The n8n workflow, ready to import |
| `lib/parseEmail.js`   | Canonical, unit-tested email classification logic |
| `lib/ghlClient.js`    | Thin wrapper around the 3 GHL endpoints we use |
| `lib/filters.js`      | Internal-domain, autoresponder, and skip-sender helpers |
| `test/parseEmail.test.js` | `node:test` unit tests — `npm test` |
| `test/fixtures/*.eml` | Realistic sample emails covering each branch |
| `.env.example`        | All required environment variables |

The n8n Code node in `workflow.json` inlines a trimmed copy of `lib/parseEmail.js` — see ARCHITECTURE.md for why.

## Setup — from zero to deployed

### 1. Google Workspace automation inbox

1. In your Google Workspace admin panel, create `automation@hellolunajoy.com` (or whatever you name it; keep it in sync with `AUTOMATION_EMAIL`).
2. Enable IMAP / Gmail API access on the mailbox. If you're using n8n's Gmail OAuth, you'll sign in as this user when setting up the credential below.
3. (Optional) Set up a "Sent by me / BCC'd me" filter just for clarity — not required by the workflow.

### 2. GHL Private Integration Token

1. GHL → **Settings → Integrations → Private Integrations → Create new**.
2. Grant at least: `contacts.readonly`, `contacts.write`, `conversations/message.write`.
3. Copy the generated token. It starts with `pit-`. This goes into `GHL_PRIVATE_INTEGRATION_TOKEN`.
4. Note your **location ID** (Settings → Business Profile). That's `GHL_LOCATION_ID`.

### 3. Rep → GHL user ID mapping (optional but recommended)

For each sales rep whose emails should be sync'd, look up their GHL user ID:

```
GET https://services.leadconnectorhq.com/users/?locationId=<LOCATION_ID>
Authorization: Bearer <PIT>
Version: 2021-07-28
```

Build a JSON object keyed by lowercase LunaJoy email. This goes into `REP_USER_MAP`:

```json
{"nicole@hellolunajoy.com":"abc123","beatriz@hellolunajoy.com":"def456"}
```

Unmapped reps just won't have `assignedTo` set on created contacts — everything else still works.

### 4. Google Sheet for the sync log

1. Create a Sheet named whatever you like (e.g. `LunaJoy Sync Log`). Copy the ID from the URL into `LOG_SHEET_ID`.
2. Add a tab named `sync_log`.
3. Add this header row exactly:

   ```
   timestamp | rep | externalEmail | type | skipReason | contactId | status | errorMessage | subject | gmailMessageId | multiRecipient
   ```

### 5. Import the workflow into n8n

1. **Settings → Variables / Environment** → add all the keys from `.env.example`.
2. **Credentials → New** → Gmail OAuth2 → sign in as the automation inbox.
3. **Credentials → New** → Google Sheets OAuth2 → sign in with the account that owns the log sheet.
4. **Workflows → Import from file** → select `workflow.json`.
5. Open each node with the red "credential missing" pill and map it to the credentials you just created:
   - `Gmail Trigger` → the Gmail cred
   - `Append to Sync Log`, `Append Skip Log`, `Append Error Log` → the Sheets cred
6. Save.

### 6. Run the test suite

```
cd lunajoy-gmail-ghl-sync
npm test
```

All 18 tests should pass. Tests have no runtime dependencies — they use `node:test` (built-in).

### 7. Flip the workflow to Active

Toggle the workflow "Active" in n8n. It polls the automation inbox every minute.

## How reps use it

> **To add a new clinic as you email them, BCC `automation@hellolunajoy.com`.** We'll auto-create the clinic in GHL and log your email to their CRM record. For emails that are already in GHL, just email normally — the standard GHL↔Gmail sync handles those. To log an old thread, **forward it to the same address** and we'll detect whether it was inbound or outbound and file it accordingly.

## Monitoring

- **Primary view:** the `sync_log` Google Sheet. One row per email the automation saw.
  - `type = bcc-outbound` / `forward-outbound` / `forward-inbound` → success
  - `type = skip` with `skipReason = contact-exists` → native connector is handling it (healthy)
  - `type = skip` with any other `skipReason` → intentionally ignored (autoresponder, internal-only, etc.)
  - `type = error` → a node failed; see `errorMessage` column
- **Secondary:** n8n's own **Executions** view. Failed executions surface with full payloads for debugging.

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `401 Unauthorized` on all GHL calls | `GHL_PRIVATE_INTEGRATION_TOKEN` missing, expired, or missing required scopes. Regenerate in GHL settings. |
| Contacts created but no message attached | Check the `Version` header on the message node — it uses `2021-04-15`, **not** the default `2021-07-28`. GHL is picky about this. |
| Forward classified as `unparseable` | The forwarded block is missing recognizable `From:` / `To:` lines — happens with some email clients that replace the header block with a quote. Fix the parser in `lib/parseEmail.js` (`parseForwardBlock`) and add a fixture. |
| Duplicate contacts appearing | Race condition: two emails for the same new clinic arrived near-simultaneously. `lib/ghlClient.js` handles the 400/409 "duplicate" response, but the raw HTTP Request node in n8n doesn't. See ARCHITECTURE.md → Race conditions. |
| Gmail trigger not firing | n8n's Gmail trigger uses polling; make sure the mailbox has unread emails and the credential still works (re-auth if refresh token expired). |
| Everything marked `internal-only` | Check `INTERNAL_DOMAINS` — it defaults to `hellolunajoy.com,lunajoy.com`. If your rep emails a clinic's employee whose domain matches one of those by accident, add the clinic domain to an override. |

## Known limitations

- **Inbound cold replies from unknown clinics are NOT handled.** If a prospect replies and the rep didn't previously BCC us on the outbound, the reply lands in the rep's inbox and this workflow never sees it. Handling that requires domain-wide delegation (intentionally out of scope).
- **Attachments are not uploaded to GHL.** The message body includes a line noting the attachment count; the files themselves stay in Gmail.
- **One external recipient per email.** Multi-recipient emails are still processed, but only the first external address is used. A `multiRecipient: true` flag shows up in the log so operators can manually add the others.
- **HTML-only emails** get a best-effort HTML→text conversion. Heavily-designed newsletters may render as noise — but those should fail the autoresponder filter anyway.
- **No retroactive backfill.** The automation only processes emails received after it's turned on.

## Assumptions to verify

These reflect the spec in the build brief; if GHL's API surface has changed, they need re-verification before the workflow goes live:

- `GET /contacts/?query=<email>&locationId=<id>` returns `{ contacts: [...] }`. We exact-match on `email` and `emails[]` to guard against the query matching on name.
- `POST /contacts/` accepts `tags` as `string[]` and `assignedTo` as the rep's GHL user ID. The response contains `{ contact: { id, ... } }`.
- `POST /conversations/messages` accepts `metadata.timestamp` for historical backdating and `idempotencyKey` in the body (we send it as a header too).
- Rate limit: 100 req / 10s per resource, 200k/day.

If any of these diverge from current GHL docs, update `lib/ghlClient.js` and the corresponding HTTP Request nodes in `workflow.json`.

## Development

```
npm test                    # run unit tests
node --test --watch test/   # watch mode during development
```

No runtime dependencies. Node 18+ required.
