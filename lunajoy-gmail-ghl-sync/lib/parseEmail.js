'use strict';

/**
 * @module parseEmail
 *
 * Pure email-classification logic for the LunaJoy Gmail→GHL automation.
 *
 * Input: a parsed email object (from n8n's Gmail/IMAP node output). Expected shape:
 *   {
 *     from:    string | { address, name } | Array<...>,
 *     to:      string | Array<string|{address,name}>,
 *     cc:      ...,
 *     bcc:     ...,                 // rarely present on received mail
 *     subject: string,
 *     text:    string,
 *     html:    string,
 *     headers: Record<string, string | string[]>,
 *     date:    string | Date,
 *     messageId: string,            // n8n usually surfaces this
 *     threadId:  string,            // Gmail trigger provides this
 *   }
 *
 * Output shape is documented in README / build brief.
 */

const {
  internalDomains,
  skipSenderPatterns,
  isInternalEmail,
  isSkipSender,
  isAutoresponderByHeaders,
} = require('./filters');

// ---------- address parsing ---------------------------------------------------

const EMAIL_RX = /([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})/i;
const EMAIL_GLOBAL_RX = /([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})/gi;

/**
 * Parse one address string into { name, address }.
 * Handles:
 *   "Dr. Jane Smith" <jane@clinic.com>
 *   Dr. Jane Smith <jane@clinic.com>
 *   <jane@clinic.com>
 *   jane@clinic.com
 * @param {string} raw
 * @returns {{name: string|null, address: string}|null}
 */
function parseAddress(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  const angle = s.match(/^(.*)<\s*([^>]+?)\s*>\s*$/);
  if (angle) {
    const name = angle[1].trim().replace(/^"|"$/g, '').trim() || null;
    const address = angle[2].trim().toLowerCase();
    if (!EMAIL_RX.test(address)) return null;
    return { name, address };
  }
  const m = s.match(EMAIL_RX);
  if (!m) return null;
  return { name: null, address: m[1].toLowerCase() };
}

/**
 * Normalize any header-ish value into an array of parsed addresses.
 * Accepts: string ("a@x.com, b@y.com"), array of strings, array of {address,name}, object.
 * @returns {Array<{name: string|null, address: string}>}
 */
function parseAddressList(val) {
  if (val == null) return [];
  if (Array.isArray(val)) {
    return val.flatMap((v) => parseAddressList(v));
  }
  if (typeof val === 'object') {
    if (val.address) {
      return [{
        name: (val.name && String(val.name).trim()) || null,
        address: String(val.address).toLowerCase().trim(),
      }];
    }
    if (val.value) return parseAddressList(val.value);
    if (val.text) return parseAddressList(val.text);
    return [];
  }
  if (typeof val !== 'string') return [];

  // Split on commas outside of quoted segments / angle brackets.
  const out = [];
  let depth = 0;
  let quoted = false;
  let buf = '';
  for (let i = 0; i < val.length; i++) {
    const c = val[i];
    if (c === '"' && val[i - 1] !== '\\') quoted = !quoted;
    else if (!quoted && c === '<') depth++;
    else if (!quoted && c === '>') depth--;
    if (c === ',' && !quoted && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) out.push(buf.trim());

  return out.map(parseAddress).filter(Boolean);
}

/**
 * Split a display name into { firstName, lastName }.
 * Strips leading titles (Dr., Mr., Mrs., Ms., Prof.) for cleaner first-name.
 * @param {string|null} name
 */
function splitName(name) {
  if (!name) return { firstName: null, lastName: null };
  let n = String(name).trim().replace(/^"|"$/g, '').trim();
  n = n.replace(/^(dr|mr|mrs|ms|prof|rev|sr|jr)\.?\s+/i, '');
  if (!n) return { firstName: null, lastName: null };
  const parts = n.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

// ---------- forward-block detection & parsing --------------------------------

const FORWARD_MARKERS = [
  /^-{3,}\s*Forwarded message\s*-{3,}/im,
  /^Begin forwarded message:/im,
  /^-{3,}\s*Original Message\s*-{3,}/im,
  /^From:\s.+\nSent:\s.+\nTo:\s.+/im, // Outlook-style block
];

function hasForwardMarker(body) {
  if (!body) return false;
  return FORWARD_MARKERS.some((rx) => rx.test(body));
}

/**
 * Parse a Gmail-style forwarded block out of the email body.
 * Returns the inner From/To/Subject/Date it finds, or null on failure.
 * Only the fields are parsed — the nested body is not extracted (not needed;
 * we use the whole email body for the message content).
 *
 * @param {string} body
 * @returns {{ from: string|null, to: string|null, subject: string|null, date: string|null }|null}
 */
function parseForwardBlock(body) {
  if (!body) return null;

  // Find the marker line, then take the block that follows.
  let idx = -1;
  for (const rx of FORWARD_MARKERS) {
    const m = body.match(rx);
    if (m && m.index != null) {
      idx = m.index + m[0].length;
      break;
    }
  }
  if (idx < 0) return null;

  // Slice ~40 lines after the marker — plenty for the header block.
  const tail = body.slice(idx).split(/\r?\n/).slice(0, 40).join('\n');

  const pick = (label) => {
    const rx = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, 'im');
    const m = tail.match(rx);
    return m ? m[1].trim() : null;
  };

  const from = pick('From');
  const to = pick('To');
  const subject = pick('Subject');
  const date = pick('Date') || pick('Sent');

  if (!from && !to) return null;
  return { from, to, subject, date };
}

// ---------- helpers ----------------------------------------------------------

function normalizeBody({ text, html }) {
  if (text && text.trim()) return text;
  if (html && html.trim()) {
    // Minimal HTML→text. Good enough for logging / GHL message content.
    // For production-grade HTML parsing, consider html-to-text in n8n Code node.
    return String(html)
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  return '';
}

function toIso(date) {
  if (!date) return null;
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

function firstExternal(list, internalDoms, automationEmail) {
  const auto = (automationEmail || '').toLowerCase();
  return list.find((a) => {
    if (!a || !a.address) return false;
    if (a.address === auto) return false;
    return !isInternalEmail(a.address, internalDoms);
  }) || null;
}

// ---------- main API ---------------------------------------------------------

/**
 * @typedef {Object} ParseOptions
 * @property {string} [automationEmail]    The magic BCC inbox (excluded from external-recipient search).
 * @property {string} [internalDomainsEnv] Raw INTERNAL_DOMAINS env string.
 * @property {string} [skipSenderPatternsEnv] Raw SKIP_SENDER_PATTERNS env string.
 */

/**
 * Classify and extract data from a single email.
 *
 * @param {Object} email  Parsed email (shape above).
 * @param {ParseOptions} [opts]
 * @returns {Object}      { type, skipReason?, externalEmail, externalName, repEmail, ... }
 */
function parseEmail(email, opts = {}) {
  const automationEmail = (opts.automationEmail || process.env.AUTOMATION_EMAIL || '').toLowerCase();
  const internalDoms = internalDomains(opts.internalDomainsEnv ?? process.env.INTERNAL_DOMAINS);
  const skipPatterns = skipSenderPatterns(opts.skipSenderPatternsEnv ?? process.env.SKIP_SENDER_PATTERNS);

  const fromList = parseAddressList(email?.from);
  const from = fromList[0] || null;
  const toList = parseAddressList(email?.to);
  const ccList = parseAddressList(email?.cc);
  const headers = email?.headers || {};

  const body = normalizeBody({ text: email?.text, html: email?.html });
  const originalTimestamp = toIso(email?.date) || toIso(headers?.date);
  const subject = email?.subject || '';
  const gmailMessageId = email?.messageId || headers?.['message-id'] || headers?.['Message-ID'] || null;
  const threadId = email?.threadId || null;

  const baseOut = {
    type: 'skip',
    externalEmail: null,
    externalName: null,
    repEmail: from?.address || null,
    direction: null,
    subject,
    body,
    originalTimestamp,
    gmailMessageId,
    threadId,
    multiRecipient: false,
  };

  // Autoresponder / bounce detection first — cheap and short-circuits.
  if (from && (isSkipSender(from.address, skipPatterns) || isAutoresponderByHeaders(headers))) {
    return { ...baseOut, skipReason: 'autoresponder' };
  }

  // Combined recipient list excluding the automation inbox.
  const allRecipients = [...toList, ...ccList].filter(
    (a) => a && a.address && a.address !== automationEmail,
  );

  const fromIsInternal = from && isInternalEmail(from.address, internalDoms);

  // -------- Case: forward (rep forwards an existing email to the automation inbox) --------
  const looksLikeForward =
    fromIsInternal &&
    allRecipients.length === 0 && // only the automation inbox was addressed
    hasForwardMarker(body);

  if (looksLikeForward) {
    const inner = parseForwardBlock(body);
    if (!inner || (!inner.from && !inner.to)) {
      return { ...baseOut, skipReason: 'unparseable' };
    }
    const innerFrom = parseAddress(inner.from || '');
    const innerToList = parseAddressList(inner.to || '');
    const innerTs = toIso(inner.date) || originalTimestamp;

    // Forward of a received email (external sender)
    if (innerFrom && !isInternalEmail(innerFrom.address, internalDoms)) {
      return {
        ...baseOut,
        type: 'forward-inbound',
        direction: 'inbound',
        externalEmail: innerFrom.address,
        externalName: innerFrom.name,
        repEmail: from.address,
        subject: inner.subject || subject,
        originalTimestamp: innerTs,
      };
    }

    // Forward of a sent email (internal sender in inner From) → external is inner To
    const external = firstExternal(innerToList, internalDoms, automationEmail);
    if (!external) {
      return { ...baseOut, skipReason: 'no-external-recipient' };
    }
    const moreExternal = innerToList.filter(
      (a) => a && a.address && a.address !== automationEmail && !isInternalEmail(a.address, internalDoms),
    ).length > 1;
    return {
      ...baseOut,
      type: 'forward-outbound',
      direction: 'outbound',
      externalEmail: external.address,
      externalName: external.name,
      repEmail: (innerFrom && innerFrom.address) || from.address,
      subject: inner.subject || subject,
      originalTimestamp: innerTs,
      multiRecipient: moreExternal,
    };
  }

  // -------- Case: BCC outbound (From is internal, To has an external recipient) --------
  if (fromIsInternal) {
    const external = firstExternal(allRecipients, internalDoms, automationEmail);
    if (!external) {
      // All non-automation recipients are internal → skip
      if (allRecipients.every((a) => isInternalEmail(a.address, internalDoms))) {
        if (allRecipients.length === 0) {
          // Only automation inbox — and we didn't find a forward marker.
          return { ...baseOut, skipReason: 'unparseable' };
        }
        return { ...baseOut, skipReason: 'internal-only' };
      }
      return { ...baseOut, skipReason: 'no-external-recipient' };
    }
    const externals = allRecipients.filter(
      (a) => !isInternalEmail(a.address, internalDoms),
    );
    return {
      ...baseOut,
      type: 'bcc-outbound',
      direction: 'outbound',
      externalEmail: external.address,
      externalName: external.name,
      repEmail: from.address,
      multiRecipient: externals.length > 1,
    };
  }

  // -------- Case: everything else --------
  // From is external and recipients are internal → this is an inbound email that
  // landed in the automation inbox directly. Out of scope per build brief.
  if (from && !fromIsInternal) {
    return { ...baseOut, skipReason: 'no-external-recipient' };
  }

  return { ...baseOut, skipReason: 'unparseable' };
}

module.exports = {
  parseEmail,
  // exported for unit testing
  parseAddress,
  parseAddressList,
  splitName,
  hasForwardMarker,
  parseForwardBlock,
  normalizeBody,
};
