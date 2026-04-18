'use strict';

/**
 * @module filters
 * Address / header filters used by parseEmail.
 * Pure functions — no external I/O.
 */

const DEFAULT_INTERNAL_DOMAINS = ['hellolunajoy.com', 'lunajoy.com'];

const DEFAULT_SKIP_SENDER_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
  /^bounces?@/i,
  /^calendar-notification@google\.com$/i,
  /@bounces\./i,
];

const AUTORESPONDER_HEADERS = [
  'auto-submitted',        // RFC 3834 — any value other than "no" indicates automated
  'x-autoreply',
  'x-autorespond',
  'x-auto-response-suppress',
];

/**
 * Parse comma-separated env string into an array of trimmed non-empty values.
 * @param {string|undefined} raw
 * @param {string[]} fallback
 * @returns {string[]}
 */
function parseList(raw, fallback) {
  if (!raw) return fallback;
  const parts = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : fallback;
}

/**
 * Build the set of internal domains from env or defaults.
 * @param {string|undefined} envVal e.g. "hellolunajoy.com,lunajoy.com"
 * @returns {string[]} lowercase domains without leading "@"
 */
function internalDomains(envVal) {
  return parseList(envVal, DEFAULT_INTERNAL_DOMAINS).map((d) =>
    d.replace(/^@/, '').toLowerCase(),
  );
}

/**
 * Build the skip-sender regex list from env or defaults.
 * @param {string|undefined} envVal comma-separated regex strings
 * @returns {RegExp[]}
 */
function skipSenderPatterns(envVal) {
  if (!envVal) return DEFAULT_SKIP_SENDER_PATTERNS;
  const parts = String(envVal).split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return DEFAULT_SKIP_SENDER_PATTERNS;
  const compiled = [];
  for (const p of parts) {
    try {
      compiled.push(new RegExp(p, 'i'));
    } catch {
      // ignore bad regex — caller may want to log, but filters.js stays pure
    }
  }
  return compiled.length ? compiled : DEFAULT_SKIP_SENDER_PATTERNS;
}

/**
 * @param {string|undefined|null} email
 * @param {string[]} domains lowercase, no @
 * @returns {boolean}
 */
function isInternalEmail(email, domains) {
  if (!email) return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return domains.includes(domain);
}

/**
 * @param {string|undefined|null} email
 * @param {RegExp[]} patterns
 */
function isSkipSender(email, patterns) {
  if (!email) return false;
  return patterns.some((rx) => rx.test(email));
}

/**
 * Detect autoresponder based on headers (case-insensitive keys).
 * Header values are strings; arrays/objects from some libs are stringified.
 * @param {Record<string,any>} headers
 * @returns {boolean}
 */
function isAutoresponderByHeaders(headers) {
  if (!headers || typeof headers !== 'object') return false;
  const lower = {};
  for (const [k, v] of Object.entries(headers)) {
    lower[String(k).toLowerCase()] = Array.isArray(v) ? v.join(',') : v;
  }
  for (const key of AUTORESPONDER_HEADERS) {
    if (lower[key] && String(lower[key]).trim().toLowerCase() !== 'no') return true;
  }
  const precedence = lower['precedence'];
  if (precedence) {
    const v = String(precedence).toLowerCase();
    if (v.includes('bulk') || v.includes('auto_reply') || v.includes('auto-reply') || v.includes('junk')) {
      return true;
    }
  }
  return false;
}

module.exports = {
  DEFAULT_INTERNAL_DOMAINS,
  DEFAULT_SKIP_SENDER_PATTERNS,
  parseList,
  internalDomains,
  skipSenderPatterns,
  isInternalEmail,
  isSkipSender,
  isAutoresponderByHeaders,
};
