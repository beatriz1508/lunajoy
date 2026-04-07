import type { KnowledgeEntry } from "./knowledge"

export const SEED_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "seed-1",
    title: "Handling Price Objections Like a Consultant",
    content: `When a prospect says "it's too expensive", never defend the price immediately. Instead, ask: "Compared to what? What's the cost of NOT solving this problem?"

The real objection is rarely price — it's unclear ROI. Your job is to build the business case together with the prospect. Calculate the cost of the status quo: lost revenue, wasted time, compliance risk.

Winning argument: "Our average customer sees ROI in 4.2 months. What would a 10% improvement in your team's productivity be worth annually?"

Key technique: Reframe the conversation from "cost of our solution" to "cost of inaction."`,
    tags: { objectionType: "price", dealStage: "negotiation" },
    createdAt: "2024-09-15T10:00:00Z",
  },
  {
    id: "seed-2",
    title: "Navigating the Champion vs. Decision Maker Gap",
    content: `Your champion loves you but the final decision maker is invisible. This is the #1 deal killer.

Ask your champion: "Who else will be in the room when the final decision is made? What keeps THEM up at night?" Then craft a separate business case tailored to that person's KPIs.

Key question to qualify: "Have you bought something like this before? How did that decision get made?" This reveals the real buying process without seeming pushy.

Red flag: If your champion can't get you a meeting with the economic buyer after 3 attempts, the deal is likely stuck. Escalate or redirect.`,
    tags: { dealStage: "qualification", objectionType: "stakeholder" },
    createdAt: "2024-10-02T14:30:00Z",
  },
  {
    id: "seed-3",
    title: "Competitive Displacement: Make Them Feel the Switching Cost",
    content: `When a prospect is already using a competitor, don't attack the competitor. Instead, ask "discovery" questions that reveal gaps:

"What's one thing you wish your current solution did better?" and "If you could wave a magic wand, what would your ideal process look like?"

Then map every gap to your differentiator. The goal is to make THEM conclude they need to switch — not to convince them. Consultants facilitate decisions; reps try to persuade.

Powerful question: "On a scale of 1-10, how satisfied are you with [competitor]? What would make it a 10?" The delta between their answer and 10 is your opening.`,
    tags: {
      industry: "B2B SaaS",
      objectionType: "competitor",
      dealStage: "evaluation",
    },
    createdAt: "2024-11-10T09:15:00Z",
  },
]

export interface TrainingScenario {
  id: string
  name: string
  description: string
  difficulty: "Easy" | "Medium" | "Hard"
  xpReward: number
  prospectProfile: string
  scenario: string
}

export const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: "1",
    name: "The Price Objection",
    description:
      "A mid-market prospect says your solution is 40% more expensive than the competitor.",
    difficulty: "Easy",
    xpReward: 50,
    prospectProfile:
      "Sarah, VP of Operations at a 200-person logistics company. Budget-conscious, analytical, data-driven.",
    scenario:
      "You are in the final stages of a deal when Sarah says: \"Look, I love what you've shown me, but your price is almost double what [Competitor] is offering. I need you to justify this or I'm going with them.\"",
  },
  {
    id: "2",
    name: "The Invisible Decision Maker",
    description:
      "Your champion suddenly goes quiet. The real decision maker has entered the picture.",
    difficulty: "Medium",
    xpReward: 100,
    prospectProfile:
      "Marcus, IT Director at a 500-person healthcare company. Technical buyer, but the CFO controls budget.",
    scenario:
      'Marcus, who has been enthusiastic throughout your process, sends you a message: "Hey, I need to pause things. My CFO wants to review all new software purchases personally. She\'s skeptical about ROI on tools like this. Not sure how to move forward."',
  },
  {
    id: "3",
    name: "The Competitor is Already Installed",
    description:
      "Enterprise account. Competitor signed a 3-year contract 8 months ago. CEO wants to explore alternatives.",
    difficulty: "Hard",
    xpReward: 200,
    prospectProfile:
      "David, CEO of a 1,500-person manufacturing company. Strategic thinker, time-poor, needs clear business outcomes.",
    scenario:
      "David says: \"We signed with [Competitor] last year and we're 8 months into a 3-year contract. Our CTO pushed for them. Honestly, results have been underwhelming, but switching costs are real. Walk me through why I should even consider disrupting this.\"",
  },
  {
    id: "4",
    name: "The Stalled Negotiation",
    description:
      "An OBGYN clinic has been 'reviewing internally' for 3 weeks with no timeline. The deal is going cold.",
    difficulty: "Medium",
    xpReward: 100,
    prospectProfile:
      "Katrina, Clinic Administrator at a busy OBGYN practice. Interested but risk-averse. Reports to a Medical Director who is hard to reach.",
    scenario:
      "Katrina sounded excited on your last call two weeks ago, but now she's going quiet. You finally get her on the phone and she says: \"We're still interested in the LunaJoy program, we just haven't had time to sit down as a team and review it. Things are really busy right now. Can we reconnect next month?\"",
  },
  {
    id: "5",
    name: "The Revenue Skeptic",
    description:
      "The billing manager is interested but unconvinced the BHI revenue will actually materialize for their specific clinic.",
    difficulty: "Medium",
    xpReward: 100,
    prospectProfile:
      "James, Billing Manager at a 3-physician OBGYN clinic. Numbers-driven, skeptical of projections, has been burned by vendor promises before.",
    scenario:
      "James says: \"Look, the concept sounds good on paper, but I've heard these revenue promises before and they never pan out the way vendors say. You're telling me we can bill BHI codes and get reimbursed, but I'd need to see exactly what that looks like for OUR patient volume and OUR payer mix before I take this to the doctor. How do I know this isn't theoretical?\"",
  },
  {
    id: "6",
    name: "Champion Without Authority",
    description:
      "Your clinic champion loves the program but needs to get approval from a Medical Director who is skeptical.",
    difficulty: "Hard",
    xpReward: 200,
    prospectProfile:
      "Diana, Clinical Coordinator who initiated the conversation with LunaJoy. Enthusiastic champion, but the Medical Director Dr. Patel controls all vendor decisions and has concerns about workflow disruption.",
    scenario:
      "Diana calls you excited: \"I brought it up in our staff meeting and everyone loved the idea. But Dr. Patel is worried it'll add work for the providers. She said, and I quote: 'I don't want my physicians having to manage another vendor relationship on top of everything else.' She's the one who needs to sign off. I'm not sure how to convince her.\"",
  },
  {
    id: "7",
    name: "Convert the Pilot to a Commitment",
    description:
      "The clinic wants to 'try with a few patients' indefinitely. You need to define scope and set a conversion milestone.",
    difficulty: "Hard",
    xpReward: 200,
    prospectProfile:
      "Dr. Rivera, Medical Director of a 5-physician OBGYN group. Cautious decision-maker. Open to the program but wants to 'see how it goes' before committing.",
    scenario:
      "Dr. Rivera says: \"We're open to moving forward, but we want to start slow. Let's refer maybe 3 or 4 patients and see what happens. If it works out, we'll expand from there. We don't want to commit to anything formal yet — let's just see how it goes.\"",
  },
]

export const SEED_USER = {
  name: "Ana Souza",
  level: 2,
  levelName: "Representative",
  xp: 340,
}

export type HistoryEntry = {
  id: string
  type: "copilot" | "brainstorm" | "training"
  title: string
  date: string
  summary: string
  fullContent: string
  score?: number
  xpEarned?: number
}

export const SEED_HISTORY: HistoryEntry[] = [
  {
    id: "hist-1",
    type: "copilot",
    title: "Discovery Call with TechCorp",
    date: "2024-12-05T15:30:00Z",
    summary:
      "Strong discovery call. Identified 3 key pain points around reporting efficiency and compliance gaps. Budget confirmed at $80k. Next step: technical demo with CTO.",
    fullContent: `## Executive Summary
Strong discovery call with TechCorp. The prospect is experiencing significant pain around manual reporting processes taking 15+ hours per week. Budget is confirmed and the champion (VP Sales) has executive sponsorship.

## Key Objections Raised
1. Integration complexity with legacy CRM
2. Concern about change management for the sales team
3. ROI timeline uncertainty — CFO wants payback under 12 months

## How They Were Handled
- **Integration**: Demonstrated native CRM connector live, offered a free 30-day POC with their actual data
- **Change management**: Shared a customer success story from a team of similar size that onboarded in 3 weeks
- **ROI**: Committed to delivering a custom ROI model with their numbers before next meeting

## Recommended Follow-Up Actions
- [ ] Schedule technical demo with CTO within 5 business days
- [ ] Send ROI calculator pre-filled with their reported metrics
- [ ] Prepare case study from a logistics company with similar profile
- [ ] Loop in Customer Success to present the onboarding plan

## Follow-Up Email Draft
Subject: Next Steps — TechCorp x [Your Company] Technical Deep Dive

Hi Sarah,

Thank you for the time today — it was clear that the reporting bottleneck is costing your team significant hours every week, and I'm confident we can solve that.

As discussed, I'll set up a technical session with your CTO to walk through the CRM integration in detail. In the meantime, I'll send over a custom ROI model based on the numbers you shared.

Two things before our next meeting:
1. I'll share a case study from a logistics company that had the same integration concern — they went live in 3 weeks.
2. Can you confirm who else should be in the room for the technical demo?

Looking forward to the next step!

Best,
[Your name]`,
  },
]
