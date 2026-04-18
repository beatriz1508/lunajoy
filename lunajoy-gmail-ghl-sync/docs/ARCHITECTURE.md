# Architecture

## Data flow

```
                    ┌──────────────────────────────┐
  Rep BCCs or       │  automation@hellolunajoy.com │
  forwards email →  │  (Google Workspace inbox)    │
                    └──────────────┬───────────────┘
                                   │ poll every 1 min
                                   ▼
                    ┌──────────────────────────────┐
                    │  n8n Gmail Trigger           │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  Code: Parse Email           │
                    │  → bcc-outbound              │
                    │  → forward-outbound          │
                    │  → forward-inbound           │
                    │  → skip {autoresponder,      │
                    │          internal-only,      │
                    │          no-external-        │
                    │          recipient,          │
                    │          unparseable}        │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  IF — skip?                  │────► Sheet: sync_log (skip)
                    └──────────────┬───────────────┘
                                   │ no
                                   ▼
                    ┌──────────────────────────────┐
                    │  HTTP GET /contacts?query=…  │
                    │  Code: exact-match filter    │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  IF — exists?                │────► Sheet: sync_log (skip, native-connector-handles)
                    └──────────────┬───────────────┘
                                   │ no
                                   ▼
                    ┌──────────────────────────────┐
                    │  HTTP POST /contacts/        │
                    │  (tag: auto-created-*)       │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  Code: merge id + idempKey   │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  HTTP POST /conversations/   │
                    │            messages          │
                    │  (with metadata.timestamp)   │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  Sheet: sync_log (success)   │
                    └──────────────────────────────┘

  Errors from any HTTP node fall through to → Sheet: sync_log (error row)
```

## Code organization

The repo splits into three concerns:

1. **`lib/*.js`** — pure, testable Node modules. No n8n dependencies, no I/O beyond the GHL API calls inside `ghlClient.js`. These are the canonical source for parsing and GHL logic.

2. **`workflow.json`** — the runnable n8n workflow. Node types, connections, and credentials wiring. The Code nodes inline a trimmed version of `lib/parseEmail.js` logic (see "Inline vs require" below).

3. **`test/`** — unit tests that exercise `lib/parseEmail.js` against realistic `.eml` fixtures.

## Inline vs require

n8n Code nodes can `require` Node built-ins (`crypto`, `url`, etc.) but cannot `require` arbitrary filesystem paths unless the host is started with `NODE_FUNCTION_ALLOW_EXTERNAL` and a volume-mounted `lib/` directory. That's fragile across n8n Cloud / self-hosted / Docker deployments.

**Decision: inline the parseEmail logic into the Code node.** The workflow.json ships self-contained. The unit-tested `lib/parseEmail.js` remains the canonical source; when we update parsing rules, we update both and re-run tests.

Trade-off: two copies of the logic. Mitigation:
- `lib/parseEmail.js` has full test coverage — that's the version we trust.
- The Code node version is a close port with the same public contract (same field names, same detection rules).
- Any change to parsing rules must update both; the repo's CI (future work) can diff the two to flag drift.

## Race conditions

Two emails for the same new clinic arriving within seconds is a real edge case (rep BCCs a reply before the first workflow run finishes). The workflow handles it in two places:

1. **Lookup → Create**: if the second run's `findContactByEmail` races ahead of the first run's `createContact`, both will think the contact doesn't exist and both will POST.

2. **GHL duplicate response**: `lib/ghlClient.js` catches 400/409 responses whose body mentions "duplicate"/"already exists", re-runs the lookup, and uses the existing contact. This path isn't exercised by the n8n HTTP Request node directly — in n8n, the error branch flows to the error-logger. The duplicate is still detected next poll-cycle (the email will be logged as "contact exists").

3. **Message idempotency**: `idempotencyKey = base64url(gmailMessageId|contactId|direction)`. GHL dedupes repeat POSTs with the same key, so re-runs of the same workflow execution can't duplicate messages.

## Scale / rate limits

- GHL: 100 req / 10s, 200k/day per location. Each new-contact email is ~2–3 calls.
- n8n Gmail Trigger polls every 1 minute by default. At 100 emails/min we'd use ~300 calls/min, well under the cap.
- `ghlClient.js` (and the HTTP Request nodes) retry on 429 with exponential backoff, respecting `Retry-After`.

## Observability

One sheet, one tab (`sync_log`), one row per email. That's the operator's view — success, skip, and error rows all land here so "what happened to this email?" is one grep away. Columns per `.env.example`.
