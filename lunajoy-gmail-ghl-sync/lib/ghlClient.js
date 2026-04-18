'use strict';

/**
 * @module ghlClient
 *
 * Thin wrapper around the GoHighLevel LeadConnector REST API for the three
 * operations we need: lookup contact by email, create contact, create
 * conversation message.
 *
 * Uses node's built-in fetch (Node 18+). No third-party deps so this can be
 * inlined into an n8n Code node unchanged.
 *
 * ⚠ Endpoint details are per the build brief (verified April 2026). If GHL
 * changes a path or payload shape, adjust here — all HTTP lives in this file.
 *
 * NOTE on idempotencyKey: the build brief specifies it in the body, but GHL
 * has historically accepted idempotency keys via a header instead. We send
 * both so whichever the backend honors wins. If GHL rejects the extra field,
 * the header still protects us.
 */

const crypto = require('node:crypto');

const DEFAULT_BASE_URL = 'https://services.leadconnectorhq.com';
const DEFAULT_VERSION = '2021-07-28';
const MESSAGES_VERSION = '2021-04-15'; // some messaging endpoints want the older version

class GhlError extends Error {
  constructor(message, { status, endpoint, body } = {}) {
    super(message);
    this.name = 'GhlError';
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}

/**
 * @param {Object} opts
 * @param {string} opts.token               Private Integration Token (pit-...).
 * @param {string} opts.locationId          GHL locationId.
 * @param {string} [opts.baseUrl]           Override base URL (for testing).
 * @param {typeof fetch} [opts.fetchImpl]   Override fetch (for testing).
 * @param {Object<string,string>} [opts.repUserMap] rep email → GHL userId.
 * @param {(msg: string, meta?: object) => void} [opts.log] Optional logger.
 * @param {number} [opts.maxRetries]        Default 3.
 * @param {number} [opts.retryBaseMs]       Default 500.
 */
function createGhlClient(opts) {
  if (!opts || !opts.token) throw new Error('ghlClient: token is required');
  if (!opts.locationId) throw new Error('ghlClient: locationId is required');

  const baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const log = opts.log || (() => {});
  const maxRetries = opts.maxRetries ?? 3;
  const retryBaseMs = opts.retryBaseMs ?? 500;
  const repUserMap = opts.repUserMap || {};

  if (!fetchImpl) throw new Error('ghlClient: fetch not available (Node 18+ or provide fetchImpl)');

  /**
   * @param {string} path
   * @param {Object} init
   * @param {string} [version]
   */
  async function request(path, init = {}, version = DEFAULT_VERSION) {
    const url = `${baseUrl}${path}`;
    const headers = {
      Authorization: `Bearer ${opts.token}`,
      Version: version,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    };

    let attempt = 0;
    while (true) {
      attempt++;
      let res;
      try {
        res = await fetchImpl(url, { ...init, headers });
      } catch (err) {
        if (attempt > maxRetries) {
          throw new GhlError(`Network error: ${err.message}`, { endpoint: path });
        }
        await sleep(backoff(retryBaseMs, attempt));
        continue;
      }

      if (res.ok) {
        const text = await res.text();
        if (!text) return {};
        try { return JSON.parse(text); } catch { return { raw: text }; }
      }

      const bodyText = await safeReadText(res);
      const status = res.status;

      // 429 or 5xx → retry with backoff
      if ((status === 429 || (status >= 500 && status < 600)) && attempt <= maxRetries) {
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : backoff(retryBaseMs, attempt);
        log(`ghl retry ${attempt}/${maxRetries} after ${waitMs}ms (status ${status})`, { endpoint: path });
        await sleep(waitMs);
        continue;
      }

      throw new GhlError(
        `GHL ${init.method || 'GET'} ${path} failed: ${status} ${truncate(bodyText, 300)}`,
        { status, endpoint: path, body: truncate(bodyText, 2000) },
      );
    }
  }

  /**
   * Look up a contact by email. Performs exact, case-insensitive email match
   * on the returned list to guard against the `query` param matching on name/phone.
   *
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async function findContactByEmail(email) {
    if (!email) return null;
    const normalized = String(email).trim().toLowerCase();
    const params = new URLSearchParams({
      query: normalized,
      locationId: opts.locationId,
    });
    const data = await request(`/contacts/?${params.toString()}`, { method: 'GET' });
    const list = Array.isArray(data?.contacts) ? data.contacts : [];
    const exact = list.find((c) => {
      if (!c) return false;
      if (c.email && String(c.email).toLowerCase() === normalized) return true;
      if (Array.isArray(c.emails) && c.emails.some((e) => {
        const v = typeof e === 'string' ? e : e?.email || e?.value;
        return v && String(v).toLowerCase() === normalized;
      })) return true;
      return false;
    });
    return exact || null;
  }

  /**
   * @param {Object} p
   * @param {string} p.email
   * @param {string|null} [p.firstName]
   * @param {string|null} [p.lastName]
   * @param {string} [p.repEmail]   LunaJoy rep who originated the email; mapped via repUserMap.
   * @param {string} [p.tag]        "auto-created-bcc" or "auto-created-forward".
   * @param {string} [p.source]     Defaults to "Gmail BCC Automation".
   * @returns {Promise<{id: string}>}
   */
  async function createContact({ email, firstName, lastName, repEmail, tag, source }) {
    if (!email) throw new Error('createContact: email is required');
    const body = {
      email: String(email).toLowerCase(),
      locationId: opts.locationId,
      source: source || 'Gmail BCC Automation',
      tags: tag ? [tag] : ['auto-created-bcc'],
    };
    if (firstName) body.firstName = firstName;
    if (lastName) body.lastName = lastName;

    const ownerId = repEmail ? repUserMap[String(repEmail).toLowerCase()] : null;
    if (ownerId) body.assignedTo = ownerId;

    try {
      const data = await request('/contacts/', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      // GHL returns { contact: {...} } on success.
      const contact = data?.contact || data;
      if (!contact?.id) {
        throw new GhlError('createContact: response missing id', { endpoint: '/contacts/', body: JSON.stringify(data).slice(0, 500) });
      }
      return contact;
    } catch (err) {
      // Race condition: another invocation may have created the contact between
      // our lookup and our POST. GHL responds with 400/409 "duplicated contact"
      // (wording varies). Re-run the lookup; if it now exists, return it.
      if (err instanceof GhlError && (err.status === 400 || err.status === 409)) {
        const body = String(err.body || '').toLowerCase();
        if (body.includes('duplicate') || body.includes('already exist') || body.includes('exists')) {
          const existing = await findContactByEmail(email);
          if (existing) return existing;
        }
      }
      throw err;
    }
  }

  /**
   * @param {Object} p
   * @param {string} p.contactId
   * @param {"inbound"|"outbound"} p.direction
   * @param {string} p.externalEmail
   * @param {string} p.subject
   * @param {string} p.body
   * @param {string|null} [p.timestamp]   ISO8601; preserves original send/receive time.
   * @param {string|null} [p.messageId]   Gmail Message-ID for idempotency.
   * @param {string|null} [p.threadId]
   * @param {"email"} [p.channel]         Currently only "email".
   * @returns {Promise<Object>}
   */
  async function createMessage({
    contactId,
    direction,
    externalEmail,
    subject,
    body,
    timestamp,
    messageId,
    threadId,
    channel,
  }) {
    if (!contactId) throw new Error('createMessage: contactId is required');
    if (!direction) throw new Error('createMessage: direction is required');

    const idemSource = `${messageId || ''}|${contactId}|${direction}`;
    const idempotencyKey = crypto.createHash('sha256').update(idemSource).digest('hex');

    const payload = {
      contactId,
      channel: channel || 'email',
      direction,
      endpoint: externalEmail ? { email: String(externalEmail).toLowerCase() } : undefined,
      content: {
        text: body || '',
        subject: subject || '',
      },
      metadata: {
        timestamp: timestamp || new Date().toISOString(),
        providerMessageId: messageId || null,
        externalThreadKey: threadId || null,
      },
      idempotencyKey,
    };

    return request(
      '/conversations/messages',
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      },
      MESSAGES_VERSION,
    );
  }

  return {
    findContactByEmail,
    createContact,
    createMessage,
    // exposed for advanced callers / testing
    _request: request,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoff(base, attempt) {
  const jitter = Math.floor(Math.random() * base);
  return base * Math.pow(2, attempt - 1) + jitter;
}

async function safeReadText(res) {
  try { return await res.text(); } catch { return ''; }
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

module.exports = {
  createGhlClient,
  GhlError,
};
