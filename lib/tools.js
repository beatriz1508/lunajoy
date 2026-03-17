export const TOOLS = {
  briefing: {
    title: "Briefing digest",
    desc: "Paste today's meetings — or load from Google Calendar",
    group: "Daily",
    hasCalendar: true,
    fields: [
      { id: "f1", label: "Today's meetings & context", type: "textarea", rows: 6, placeholder: "e.g.\n9:00 — Intro call with Acme Corp (retail, 200 employees)\n11:30 — Follow-up with TechBase, sent proposal last week\n15:00 — Internal pipeline review" },
      { id: "f2", label: "Anything to flag? (optional)", type: "textarea", rows: 2, placeholder: "e.g. TechBase is comparing us with a competitor…" },
    ],
    prompt: (v) => `Generate a concise sales briefing for today.\n\nMeetings:\n${v.f1}\n${v.f2 ? "Extra context: " + v.f2 : ""}\n\nStructure:\n1. Top 3 focus points for the day\n2. Talking points per meeting (2–3 bullets each, specific to the company/context given)\n3. One key question to ask in each meeting`,
  },
  objections: {
    title: "Objection handler",
    desc: "Type an objection you just heard — get 3 tailored responses instantly",
    group: "In-call",
    fields: [
      { id: "f1", label: "Objection (as the prospect said it)", type: "textarea", rows: 3, placeholder: 'e.g. "We already use something for this"\nor "Your price is too high compared to X"' },
      { id: "f2", label: "Deal context (optional)", type: "textarea", rows: 2, placeholder: "e.g. Mid-size retail company, talking for 3 weeks, budget ~R$50k…" },
      { id: "f3", label: "Tone", type: "select", options: ["Consultative", "Direct", "Empathetic", "Challenger"] },
    ],
    prompt: (v) => `Sales objection: "${v.f1}"\n${v.f2 ? "Context: " + v.f2 : ""}\nTone: ${v.f3}\n\nGive 3 distinct responses. Each must:\n- Acknowledge the concern without being defensive\n- Reframe toward value\n- End with a follow-up question to keep the conversation going\nNumber them 1, 2, 3. Max 4 sentences each.`,
  },
  messages: {
    title: "Message insights",
    desc: "Rank your outreach messages and get AI suggestions on what to improve",
    group: "In-call",
    isMessages: true,
  },
  email: {
    title: "Email assistant",
    desc: "Describe the context, generate a draft, and send via Gmail",
    group: "Outreach",
    hasGmail: true,
    fields: [
      { id: "f1", label: "Who are you writing to?", type: "text", placeholder: "e.g. Maria, VP Sales at TechBase" },
      { id: "f2", label: "Deal stage", type: "select", options: ["First contact", "After intro call", "Proposal sent", "Follow-up (no response)", "Closing", "Post-meeting thank you"] },
      { id: "f3", label: "Goal of this email", type: "textarea", rows: 2, placeholder: "e.g. Book a demo, follow up on proposal, address pricing objection…" },
      { id: "f4", label: "Key context (optional)", type: "textarea", rows: 2, placeholder: "e.g. Spoke 5 days ago, they mentioned budget concerns…" },
    ],
    prompt: (v) => `Write a sales email.\nTo: ${v.f1}\nStage: ${v.f2}\nGoal: ${v.f3}\n${v.f4 ? "Context: " + v.f4 : ""}\n\nRules: include a subject line (prefix with "Subject: "), max 150 words in the body, end with one clear CTA. Sound human. No "I hope this finds you well" or similar filler.`,
  },
  coach: {
    title: "Meeting coach",
    desc: "Paste a transcript or import from Drive — get a full coaching report",
    group: "Outreach",
    hasDrive: true,
    driveTarget: "f1",
    fields: [
      { id: "f1", label: "Transcript (paste from Google Meet or import from Drive)", type: "textarea", rows: 10, placeholder: "Paste the full transcript here…\n\nRaw and unformatted is fine." },
      { id: "f2", label: "Meeting type", type: "select", options: ["Discovery call", "Demo", "Proposal presentation", "Follow-up", "Closing call"] },
    ],
    prompt: (v) => `Analyse this ${v.f2} transcript and write a coaching report.\n\nTranscript:\n${v.f1}\n\nReport:\n1. What went well — 2 specific moments with timestamps if available\n2. Missed opportunities — objections not addressed, questions not asked\n3. Talk ratio — was the rep listening enough?\n4. Top 3 action points for the next call with this prospect\n5. One skill to work on`,
  },
  campaigns: {
    title: "GHL campaign builder",
    desc: "Describe your campaign and get a sequence ready to paste into GHL",
    group: "Campaigns",
    fields: [
      { id: "f1", label: "Target audience", type: "text", placeholder: "e.g. Small retail businesses in Recife, 10–50 employees" },
      { id: "f2", label: "Campaign goal", type: "select", options: ["Book a demo", "Nurture leads", "Re-engage cold leads", "Post-sale upsell", "Event invitation"] },
      { id: "f3", label: "Channel", type: "select", options: ["Email sequence", "SMS sequence", "Email + SMS mixed", "WhatsApp"] },
      { id: "f4", label: "Key offer or message", type: "textarea", rows: 2, placeholder: "e.g. Free 30-day trial, no credit card required…" },
      { id: "f5", label: "Number of touches", type: "select", options: ["3", "5", "7"] },
    ],
    prompt: (v) => `Build a GHL campaign sequence.\nAudience: ${v.f1}\nGoal: ${v.f2}\nChannel: ${v.f3}\nOffer: ${v.f4}\nTouches: ${v.f5}\n\nFor each touch provide: Day number, Subject line / preview text, Full message body, CTA. Keep messages concise and human-sounding. Each touch must have a different angle. Format clearly so it can be copy-pasted directly into GHL.`,
  },
  leads: {
    title: "Lead prospecting",
    desc: "Define your ideal customer and get a full prospecting strategy",
    group: "Campaigns",
    fields: [
      { id: "f1", label: "Industry", type: "text", placeholder: "e.g. Retail, SaaS, Healthcare, Education…" },
      { id: "f2", label: "Company size", type: "select", options: ["1–10", "10–50", "50–200", "200–1000", "1000+"] },
      { id: "f3", label: "Region", type: "text", placeholder: "e.g. São Paulo, Recife, Northeast Brazil…" },
      { id: "f4", label: "Job title to target", type: "text", placeholder: "e.g. CEO, Head of Marketing, Operations Manager…" },
      { id: "f5", label: "Pain point you solve", type: "textarea", rows: 2, placeholder: "e.g. They struggle to follow up consistently with leads…" },
    ],
    prompt: (v) => `Build a lead prospecting plan.\nIndustry: ${v.f1}\nCompany size: ${v.f2}\nRegion: ${v.f3}\nTarget title: ${v.f4}\nPain point: ${v.f5}\n\nProvide:\n1. Where to find these leads (specific platforms, groups, databases, events)\n2. LinkedIn search strings to use\n3. 3 personalised ice-breaker opening lines for this ICP\n4. 4 qualifying questions to ask early\n5. 3 red flags that disqualify a lead`,
  },
  gemini: {
    title: "Gemini + Drive",
    desc: "Chat with Gemini and ask questions about your Drive files",
    group: "Google",
    isGemini: true,
  },
  gmail: {
    title: "Gmail composer",
    desc: "Write emails with AI and send directly via Gmail",
    group: "Google",
    isGmailTool: true,
    fields: [
      { id: "gf1", label: "To (email address)", type: "text", placeholder: "prospect@company.com" },
      { id: "gf2", label: "What's the email about?", type: "textarea", rows: 3, placeholder: "e.g. Follow-up after demo call on Monday, they seemed interested in the enterprise plan…" },
      { id: "gf3", label: "Tone & style", type: "select", options: ["Professional & concise", "Warm & conversational", "Assertive & direct", "Empathetic"] },
    ],
    prompt: (v) => `Write a sales email.\nRecipient: ${v.gf1}\nContext: ${v.gf2}\nTone: ${v.gf3}\n\nInclude: Subject line (prefix "Subject: "), body max 150 words, one clear CTA. Sound human.`,
  },
};

export const NAV_GROUPS = ["Daily", "In-call", "Outreach", "Campaigns", "Google"];
