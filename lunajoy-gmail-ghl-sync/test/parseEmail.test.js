'use strict';

/**
 * Unit tests for parseEmail.js — uses node:test (built-in, no deps).
 * Run with: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseEmail,
  parseAddress,
  parseAddressList,
  splitName,
  hasForwardMarker,
} = require('../lib/parseEmail');

// ---------- .eml loader (minimal; just enough for our fixtures) --------------

/**
 * @param {string} fixture filename inside test/fixtures/
 * @returns {Object} email object shaped like n8n's Gmail node output
 */
function loadEml(fixture) {
  const raw = fs.readFileSync(path.join(__dirname, 'fixtures', fixture), 'utf8');
  // Split on the first blank line separating headers from body (RFC 5322).
  const sep = raw.search(/\r?\n\r?\n/);
  const headerBlock = sep >= 0 ? raw.slice(0, sep) : raw;
  const body = sep >= 0 ? raw.slice(sep).replace(/^\r?\n\r?\n/, '') : '';

  // Unfold continuation lines (RFC 5322 §2.2.3).
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, ' ');
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    const k = m[1].trim().toLowerCase();
    if (headers[k] != null) {
      headers[k] = Array.isArray(headers[k]) ? [...headers[k], m[2]] : [headers[k], m[2]];
    } else {
      headers[k] = m[2];
    }
  }

  return {
    from: headers.from,
    to: headers.to,
    cc: headers.cc,
    bcc: headers.bcc,
    subject: headers.subject,
    text: body,
    html: '',
    headers,
    date: headers.date,
    messageId: headers['message-id'],
    threadId: null,
  };
}

const OPTS = {
  automationEmail: 'automation@hellolunajoy.com',
  internalDomainsEnv: 'hellolunajoy.com,lunajoy.com',
};

// ---------- address helpers --------------------------------------------------

test('parseAddress handles quoted display name', () => {
  assert.deepEqual(
    parseAddress('"Dr. Jane Smith" <jane@clinic.com>'),
    { name: 'Dr. Jane Smith', address: 'jane@clinic.com' },
  );
});

test('parseAddress handles unquoted display name', () => {
  assert.deepEqual(
    parseAddress('Dr. Jane Smith <jane@clinic.com>'),
    { name: 'Dr. Jane Smith', address: 'jane@clinic.com' },
  );
});

test('parseAddress handles bare email', () => {
  assert.deepEqual(
    parseAddress('jane@clinic.com'),
    { name: null, address: 'jane@clinic.com' },
  );
});

test('parseAddress handles angle-only email', () => {
  assert.deepEqual(
    parseAddress('<jane@clinic.com>'),
    { name: null, address: 'jane@clinic.com' },
  );
});

test('parseAddressList splits on commas, not commas inside quotes', () => {
  const list = parseAddressList('"Smith, Jane" <jane@clinic.com>, alex@other.org');
  assert.equal(list.length, 2);
  assert.equal(list[0].name, 'Smith, Jane');
  assert.equal(list[0].address, 'jane@clinic.com');
  assert.equal(list[1].address, 'alex@other.org');
});

test('splitName strips titles and splits first/last', () => {
  assert.deepEqual(splitName('Dr. Jane Smith'), { firstName: 'Jane', lastName: 'Smith' });
  assert.deepEqual(splitName('Madonna'), { firstName: 'Madonna', lastName: null });
  assert.deepEqual(splitName(null), { firstName: null, lastName: null });
});

test('hasForwardMarker detects Gmail and Outlook styles', () => {
  assert.equal(hasForwardMarker('---------- Forwarded message ---------\nFrom: x'), true);
  assert.equal(hasForwardMarker('Begin forwarded message:\nFrom: x'), true);
  assert.equal(hasForwardMarker('no marker here'), false);
});

// ---------- classification ---------------------------------------------------

test('outbound-bcc: classifies as bcc-outbound and picks external recipient', () => {
  const out = parseEmail(loadEml('outbound-bcc.eml'), OPTS);
  assert.equal(out.type, 'bcc-outbound');
  assert.equal(out.direction, 'outbound');
  assert.equal(out.externalEmail, 'jane@brightclinic.com');
  assert.equal(out.externalName, 'Dr. Jane Smith');
  assert.equal(out.repEmail, 'nicole@hellolunajoy.com');
  assert.equal(out.multiRecipient, false);
  assert.ok(out.originalTimestamp);
  assert.ok(out.body.length > 0);
});

test('forward-outbound: rep forwards their own sent email, picks inner To as external', () => {
  const out = parseEmail(loadEml('forward-outbound.eml'), OPTS);
  assert.equal(out.type, 'forward-outbound');
  assert.equal(out.direction, 'outbound');
  assert.equal(out.externalEmail, 'alex@riversidepeds.com');
  assert.equal(out.externalName, 'Dr. Alex Chen');
  assert.equal(out.repEmail, 'beatriz@hellolunajoy.com');
  assert.match(out.subject, /Partnership inquiry/);
});

test('forward-inbound: rep forwards a received email, picks inner From as external', () => {
  const out = parseEmail(loadEml('forward-inbound.eml'), OPTS);
  assert.equal(out.type, 'forward-inbound');
  assert.equal(out.direction, 'inbound');
  assert.equal(out.externalEmail, 'maria.rivera@sunsetfamilyhealth.com');
  assert.equal(out.externalName, 'Dr. Maria Rivera');
  assert.equal(out.repEmail, 'nicole@hellolunajoy.com');
});

test('internal-only: all recipients are @hellolunajoy.com → skip', () => {
  const out = parseEmail(loadEml('internal-only.eml'), OPTS);
  assert.equal(out.type, 'skip');
  assert.equal(out.skipReason, 'internal-only');
});

test('autoresponder: noreply + Auto-Submitted header → skip', () => {
  const out = parseEmail(loadEml('autoresponder.eml'), OPTS);
  assert.equal(out.type, 'skip');
  assert.equal(out.skipReason, 'autoresponder');
});

test('multi-recipient: captures multiRecipient=true, picks first external', () => {
  const out = parseEmail(loadEml('multi-recipient.eml'), OPTS);
  assert.equal(out.type, 'bcc-outbound');
  assert.equal(out.externalEmail, 'jane@brightclinic.com');
  assert.equal(out.multiRecipient, true);
});

test('malformed forward: missing inner header block → skip unparseable', () => {
  const out = parseEmail(loadEml('malformed-forward.eml'), OPTS);
  assert.equal(out.type, 'skip');
  assert.equal(out.skipReason, 'unparseable');
});

// ---------- edge cases -------------------------------------------------------

test('display-name extraction populates externalName; bare email leaves it null', () => {
  const withName = parseEmail({
    from: 'nicole@hellolunajoy.com',
    to: '"Dr. Jane Smith" <jane@clinic.com>',
    subject: 's', text: 'b', date: '2026-04-18T12:00:00Z', headers: {},
  }, OPTS);
  assert.equal(withName.externalName, 'Dr. Jane Smith');

  const bare = parseEmail({
    from: 'nicole@hellolunajoy.com',
    to: 'jane@clinic.com',
    subject: 's', text: 'b', date: '2026-04-18T12:00:00Z', headers: {},
  }, OPTS);
  assert.equal(bare.externalName, null);
  assert.equal(bare.externalEmail, 'jane@clinic.com');
});

test('SKIP_SENDER_PATTERNS is configurable via opts', () => {
  const out = parseEmail({
    from: 'bounces@some-newsletter.com',
    to: 'rep@hellolunajoy.com',
    subject: 's', text: 'b', date: '2026-04-18T12:00:00Z', headers: {},
  }, { ...OPTS, skipSenderPatternsEnv: '^bounces@' });
  assert.equal(out.type, 'skip');
  assert.equal(out.skipReason, 'autoresponder');
});

test('INTERNAL_DOMAINS is configurable (alias domain treated as internal)', () => {
  const out = parseEmail({
    from: 'rep@hellolunajoy.com',
    to: 'colleague@lunajoy.com',
    subject: 's', text: 'b', date: '2026-04-18T12:00:00Z', headers: {},
  }, OPTS);
  assert.equal(out.type, 'skip');
  assert.equal(out.skipReason, 'internal-only');
});

test('automation inbox is excluded from recipient count', () => {
  // Only automation + internal → no external recipient but also not just internal
  const out = parseEmail({
    from: 'rep@hellolunajoy.com',
    to: 'automation@hellolunajoy.com, teammate@hellolunajoy.com',
    subject: 'note', text: 'no forward marker here', date: '2026-04-18T12:00:00Z', headers: {},
  }, OPTS);
  assert.equal(out.type, 'skip');
  assert.equal(out.skipReason, 'internal-only');
});
