"use client"

import { useState } from "react"
import {
  BookMarked,
  Target,
  Brain,
  Phone,
  Calculator,
  Shield,
  Users,
  CheckSquare,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react"

type Section =
  | "mission"
  | "mindset"
  | "framework"
  | "pricing"
  | "objections"
  | "icp"
  | "checklist"

const SECTIONS: { id: Section; label: string; icon: React.ElementType; group: string }[] = [
  { id: "mission", label: "Mission & BHI Program", icon: Target, group: "Foundation" },
  { id: "mindset", label: "Consultant Mindset", icon: Brain, group: "Foundation" },
  { id: "framework", label: "Call Framework", icon: Phone, group: "In the Field" },
  { id: "pricing", label: "Revenue Calculator", icon: Calculator, group: "In the Field" },
  { id: "objections", label: "Objection Playbook", icon: Shield, group: "In the Field" },
  { id: "icp", label: "Who to Call", icon: Users, group: "Strategy" },
  { id: "checklist", label: "Call Checklists", icon: CheckSquare, group: "Strategy" },
]

// ─── Reusable card components ──────────────────────────────────────────
function Card({
  children,
  accent,
  className = "",
}: {
  children: React.ReactNode
  accent?: "teal" | "amber" | "red" | "purple" | "indigo"
  className?: string
}) {
  const border = accent
    ? {
        teal: "border-l-4 border-l-teal-400",
        amber: "border-l-4 border-l-amber-400",
        red: "border-l-4 border-l-red-400",
        purple: "border-l-4 border-l-purple-400",
        indigo: "border-l-4 border-l-indigo-400",
      }[accent]
    : ""
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${border} ${className}`}>
      {children}
    </div>
  )
}

function Badge({ color, children }: { color: "teal" | "amber" | "purple" | "red"; children: React.ReactNode }) {
  const styles = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    red: "bg-red-50 text-red-700",
  }
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[color]}`}>{children}</span>
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-light text-slate-900">
        {value}
        {unit && <span className="text-xs text-slate-400 font-normal ml-0.5">{unit}</span>}
      </p>
    </div>
  )
}

function RedLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-3 flex gap-2">
      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-red-700 leading-relaxed">{children}</p>
    </div>
  )
}

function VsRow({ bad, good }: { bad: string; good: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-2">
      <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700 leading-relaxed flex gap-2">
        <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>{bad}</span>
      </div>
      <div className="bg-teal-50 rounded-lg p-3 text-xs text-teal-700 leading-relaxed flex gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>{good}</span>
      </div>
    </div>
  )
}

// ─── Section components ───────────────────────────────────────────────
function MissionSection() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 italic leading-relaxed">
        LunaJoy is a care infrastructure partner — not a referral agency. That distinction matters in every conversation you have.
      </p>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">What we sell</h4>
        <Card accent="teal">
          <h3 className="text-sm font-bold text-slate-900 mb-2">The BHI Program — Behavioral Health Integration</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            A CMS-recognized model allowing primary care clinics to bill for behavioral health services
            using the <strong>99484</strong> billing code. LunaJoy delivers the service. The clinic gets
            reimbursed. We charge a per-patient-per-month (PMPM) fee.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Avg reimbursement" value="$60" unit="/patient/mo" />
            <Metric label="Max reimbursement" value="$116" unit="/patient/mo" />
          </div>
          <RedLine>
            Legal red line — never say: &quot;You only pay us when you get reimbursed.&quot;
            That is fee-splitting. It is illegal. The charge is always for services rendered.
          </RedLine>
        </Card>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Assessment layer</h4>
        <Card>
          <h3 className="text-sm font-bold text-slate-900 mb-2">PHQ-8 + GAD-7 — Double the Billing Opportunity</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            LunaJoy runs two standardized assessments in a single seamless digital form.
            The patient fills out one form. The clinic can bill twice.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">PHQ-8</p>
              <p className="text-sm font-medium text-slate-800">Depression screening</p>
              <p className="text-xs text-slate-500 mt-1">Does NOT include suicidal ideation — keeps conversation clean for non-psychiatric settings.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">GAD-7</p>
              <p className="text-sm font-medium text-slate-800">Anxiety screening</p>
              <p className="text-xs text-slate-500 mt-1">OB/birthing centers → switch to EPDS (Edinburgh Postnatal Depression Scale).</p>
            </div>
          </div>
          <RedLine>Never say &quot;diagnose.&quot; Staff are identifying risk and referring. LunaJoy&apos;s clinicians handle clinical judgment.</RedLine>
        </Card>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Three pricing models</h4>
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <Badge color="teal">Option A</Badge>
            <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">Per-patient PMPM</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Best for established clinics already screening. Stable volume, confidence in enrollment.</p>
            <p className="text-xs text-slate-400 italic mt-2">&quot;You only pay for patients actively receiving care.&quot;</p>
          </Card>
          <Card>
            <Badge color="amber">Option B</Badge>
            <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">Flat monthly fee</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Best for clinics not yet screening. Lower volume. Full population management.</p>
            <p className="text-xs text-slate-400 italic mt-2">&quot;We handle everything. You get a guaranteed service.&quot;</p>
          </Card>
          <Card>
            <Badge color="purple">Option C</Badge>
            <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">Hybrid model</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Flat fee for screening + lower PMPM for BHI. For clinics building confidence as they grow.</p>
            <p className="text-xs text-slate-400 italic mt-2">&quot;You control both the upside and the downside.&quot;</p>
          </Card>
        </div>
      </div>

      <Card accent="teal">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Service guarantee — your unfair advantage</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          &quot;You&apos;re not taking a financial risk here. If we don&apos;t deliver the service, you don&apos;t
          pay for it. The only scenario where this costs you money is the scenario where you&apos;re
          already making money.&quot;
        </p>
        <p className="text-xs text-slate-500 mt-3">
          <strong>Option A:</strong> If a patient enrolls but never receives a service, the clinic is not charged.{" "}
          <strong>Option B:</strong> If LunaJoy fails to serve a minimum threshold, the clinic receives a partial refund.
        </p>
      </Card>
    </div>
  )
}

function MindsetSection() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 italic leading-relaxed">
        Most sales reps show up to present. A LunaJoy consultant shows up to diagnose. That changes everything.
      </p>

      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
        <p className="text-sm text-teal-800 leading-relaxed">
          <strong>Core principle:</strong> &quot;We&apos;re not going to people to tell them what we do.
          We&apos;re going to people to talk about their pain point. I know your problem better than you
          do — because I&apos;ve already worked with 100+ clinics just like yours.&quot;
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Rep vs Consultant</h4>
        <div className="grid grid-cols-2 gap-2 mb-1">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider px-3">Avoid</p>
          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider px-3">Be this</p>
        </div>
        <VsRow bad="Opens with a product overview" good="Opens by setting context and structure" />
        <VsRow bad="Talks about features and pricing" good="Talks about the clinic's pain first" />
        <VsRow bad="Reacts to what the prospect says" good="Leads the conversation with intention" />
        <VsRow bad="Hopes the prospect sees value" good="Creates the conditions for value to land" />
        <VsRow bad="Avoids pushback" good="Welcomes objections as diagnostic signals" />
        <VsRow bad='Ends with "let me know if you have questions"' good="Ends with a clear, confirmed next step" />
        <VsRow bad="Takes rejection personally" good="Chases rejections — they're data, not failure" />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Language standards</h4>
        <div className="grid grid-cols-2 gap-2 mb-1">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider px-3">Remove</p>
          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider px-3">Use instead</p>
        </div>
        <VsRow bad='"I think this could work for you"' good='"What we typically see with clinics like yours is…"' />
        <VsRow bad='"Maybe we can try…"' good='"This is how it works in practice…"' />
        <VsRow bad={'"I\'m not sure, but…"'} good={'"Based on what you\'ve told me, this is where this usually leads…"'} />
        <VsRow bad={'"It depends, I guess"'} good={'"The data shows 30% of patients screen positive — that\'s not an estimate, that\'s a study."'} />
        <VsRow bad={'"Hopefully this fits your needs"'} good={'"We\'ve made the numbers work for every clinic in your situation."'} />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Non-negotiable behaviors</h4>
        <div className="grid grid-cols-2 gap-3">
          <Card accent="teal">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Camera ON — always</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Every external call. No exceptions unless previously communicated. Eye level, neutral background, face lit.</p>
          </Card>
          <Card accent="teal">
            <h3 className="text-sm font-bold text-slate-900 mb-1">One topic at a time</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Jumping between pricing, assessments, workflow, and guarantees confuses the prospect. Finish one point before the next.</p>
          </Card>
          <Card accent="teal">
            <h3 className="text-sm font-bold text-slate-900 mb-1">No weak language</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Every &quot;I think,&quot; &quot;maybe,&quot; or &quot;hopefully&quot; costs you credibility. You are the expert. Speak like one.</p>
          </Card>
          <Card accent="teal">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Every call has a next step</h3>
            <p className="text-xs text-slate-600 leading-relaxed">No call ends with &quot;I&apos;ll think about it.&quot; If that&apos;s the last thing said, you haven&apos;t done your job.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function FrameworkSection() {
  const steps = [
    {
      num: 1, title: "Set context", time: "1–2 min",
      desc: "Establish authority + relevance. You're not here to pitch — you're here to diagnose.",
      quote: '"I\'ll give a quick overview of how we typically work with clinics like yours, then we\'ll go into your current setup and see what actually makes sense for you."',
    },
    {
      num: 2, title: "Structure the situation", time: "3–5 min",
      desc: "Organize what they tell you. Don't let messy input stay messy.",
      quote: '"Let me make sure I\'m understanding — you\'re seeing [X] patients, but you don\'t have a formal mental health screening process yet. Is that right?"',
    },
    {
      num: 3, title: "Clarify the problem", time: "5–10 min",
      desc: "Surface their real pain. Don't assume — ask and confirm.",
      quote: '"Post-COVID, the prevalence of mental health issues has gone up significantly. Are you seeing that in your patient population?"',
    },
    {
      num: 4, title: "Introduce direction", time: "5 min",
      desc: "Show a logical path forward. This is where BHI enters the conversation — lightly.",
      quote: '"Based on what you\'ve told me, here\'s how this typically works for a clinic like yours. Let me walk you through the math so you can see exactly what this looks like."',
    },
    {
      num: 5, title: "Define next step", time: "2 min",
      desc: "Move the conversation forward. Never leave without a specific action, owner, and date.",
      quote: '"So next step is [X]. I\'ll send you [Y] by [date]. Then we\'ll reconnect on [day] to [action]. Does that work for you?"',
    },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 italic leading-relaxed">
        Every sales call follows the same structure. Master this and the conversation becomes predictable — even when the prospect isn&apos;t.
      </p>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">5-step call framework</h4>
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.num} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                {s.num}
              </div>
              <Card className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                  <Badge color="teal">{s.time}</Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-2">{s.desc}</p>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-700 leading-relaxed italic">{s.quote}</p>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Real-time behaviors</h4>
        <Card accent="purple">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Structure out loud</h3>
          <p className="text-xs text-slate-600 mb-2">Never think silently in front of a prospect. Organize complexity verbally.</p>
          <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
            <li>&quot;Let me break this into two parts…&quot;</li>
            <li>&quot;There are two things happening here…&quot;</li>
            <li>&quot;Let&apos;s focus on this first, then come back to pricing…&quot;</li>
            <li>&quot;Let me structure this — I want to make sure I&apos;m capturing this correctly.&quot;</li>
          </ul>
        </Card>
        <Card accent="amber" className="mt-3">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Interrupt to clarify</h3>
          <p className="text-xs text-slate-600 mb-2">A confused prospect doesn&apos;t buy. They say &quot;let me think about it&quot; and disappear. Interrupt cleanly:</p>
          <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
            <li>&quot;Let me pause you — I want to make sure I&apos;m understanding this correctly before we go further.&quot;</li>
            <li>&quot;Just to check — when you say [X], do you mean [Y] or [Z]?&quot;</li>
            <li>&quot;Can I reflect back what I&apos;m hearing? I want to make sure we&apos;re on the same page.&quot;</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function PricingSection() {
  const [pts, setPts] = useState(1000)
  const [pos, setPos] = useState(30)
  const [enr, setEnr] = useState(50)
  const [rei, setRei] = useState(60)

  const enrolled = Math.round(pts * (pos / 100) * (enr / 100))
  const revenue = enrolled * rei
  const fee = Math.round(revenue * 0.5)
  const net = revenue - fee
  const mult = (revenue / (fee || 1)).toFixed(1)

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 italic leading-relaxed">
        Never lead with price. Price means nothing without context. Run this math live with the decision maker — it turns the pitch into a business planning session.
      </p>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Discovery questions to ask first</h4>
        <Card>
          <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
            <li>What is your payer mix? (Medicaid/Medicare vs commercial)</li>
            <li>How many patients do you see per week or month?</li>
            <li>Average caseload per provider? How many providers?</li>
            <li>Are you currently doing any mental health screening?</li>
            <li>What percentage of your population would you estimate has mental health needs?</li>
          </ol>
          <p className="text-xs text-slate-400 italic mt-3">
            &quot;No problem — give me a ballpark. We can sharpen it later. I just want to show you how the math
            typically works for a clinic your size.&quot;
          </p>
        </Card>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Live revenue calculator</h4>
        <Card>
          <div className="space-y-4">
            {[
              { label: "Monthly patients", value: pts, set: setPts, min: 100, max: 3000, step: 50, fmt: (v: number) => v.toLocaleString() },
              { label: "Positive screen rate", value: pos, set: setPos, min: 10, max: 50, step: 1, fmt: (v: number) => `${v}%` },
              { label: "BHI enrollment rate", value: enr, set: setEnr, min: 20, max: 80, step: 5, fmt: (v: number) => `${v}%` },
              { label: "Avg reimbursement", value: rei, set: setRei, min: 60, max: 116, step: 1, fmt: (v: number) => `$${v}` },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-40 flex-shrink-0">{s.label}</span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="flex-1 accent-teal-500"
                />
                <span className="text-sm font-semibold text-slate-900 w-16 text-right">{s.fmt(s.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-3 mt-3">
          <Metric label="Enrolled patients" value={enrolled.toLocaleString()} unit="/mo" />
          <Metric label="Clinic revenue" value={`$${revenue.toLocaleString()}`} unit="/mo" />
          <Metric label="Est. LunaJoy fee" value={`$${fee.toLocaleString()}`} unit="/mo" />
          <div className="bg-teal-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider mb-1">Clinic net gain</p>
            <p className="text-2xl font-light text-teal-700">
              ${net.toLocaleString()}<span className="text-xs text-teal-500 font-normal ml-0.5">/mo</span>
            </p>
          </div>
        </div>

        <Card accent="teal" className="mt-3">
          <h3 className="text-sm font-bold text-slate-900 mb-1">ROI summary</h3>
          <div className="bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((net / (revenue || 1)) * 100))}%` }} />
          </div>
          <p className="text-xs text-slate-600 mt-2">
            For every $1 paid to LunaJoy, this clinic generates ${mult} in BHI revenue.
            Net margin after fee: {Math.round((net / (revenue || 1)) * 100)}%.
            And if LunaJoy doesn&apos;t serve a minimum threshold, the clinic receives a partial refund — they cannot lose money from this.
          </p>
        </Card>
      </div>

      <Card accent="amber">
        <h3 className="text-sm font-bold text-slate-900 mb-2">When they ask &quot;how much?&quot; too early</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          &quot;Great question — and I want to give you a real number, not a range that means nothing.
          The price actually depends on a few things specific to your clinic. Can I ask you two quick questions
          so I can give you something accurate?&quot;
        </p>
        <p className="text-xs text-slate-400 italic mt-2">
          If they push: &quot;Most clinics your size are looking at $X–$Y/month. But honestly, the more interesting
          number is what you stand to earn — which is usually 2x our fee or more. Let me show you.&quot;
        </p>
      </Card>
    </div>
  )
}

function ObjectionsSection() {
  const [active, setActive] = useState(0)

  const objections = [
    {
      label: "Price", q: '"This is too expensive."',
      avoid: "I understand, we can try to work something out… or let me see if I can get you a discount.",
      say: '"Let\'s look at the numbers together. If your clinic is seeing [X] patients and 30% screen positive, you\'re looking at [Y]/month in new revenue. Our fee is [Z]. The math almost always works in your favor — and if it doesn\'t, our guarantee protects you. What specifically feels high?"',
      note: "Price objections mean they don't yet see the value, or the math hasn't clicked. Go back to the revenue calculator. Make the ROI undeniable before negotiating.",
    },
    {
      label: "Already screen", q: '"We already do our own screenings."',
      avoid: "Oh, okay — well, if you change your mind…",
      say: '"That\'s great — it means your team already cares about this, which makes integration easier. Quick question: how are you doing them — pen and paper, or digital?" [If pen and paper:] "Are you getting all patients screened? Most clinics find that even with a process, admin burden means they\'re missing people. Our system is digital, auto-scored, and sends an instant report. And because we run PHQ-8 + GAD-7 together, you can bill for both separately. Are you currently doing that?"',
      note: "Clinics that already screen are better prospects — they're believers. Your job is to show LunaJoy is a better execution of something they already value.",
    },
    {
      label: "Too long", q: '"Our patients won\'t complete a long assessment."',
      avoid: "Yeah, I understand, it can be a barrier…",
      say: '"That\'s a common concern — here\'s what the data shows: because our form combines both assessments into one seamless digital flow, completion rates are actually higher than paper-based single assessments. Patients think they\'re filling out one form."',
      note: "The shorter PHQ-2/GAD-2 version exists as a backup. Never offer it first — it reduces billing value.",
    },
    {
      label: "Is this proven?", q: '"How many clinics are actually doing this?"',
      avoid: "We're still building it out, but we think it's a great opportunity…",
      say: '"We\'re a preferred vendor with Femwell and Florida Women\'s Care networks, and work with several hospital systems. Across all our partnerships, reimbursement averages around $60, with some going up to $116. Every clinic we\'ve onboarded has generated net-positive revenue — which is exactly why we built the guarantee in the first place."',
      note: "You don't need to share exact pipeline numbers. The guarantee itself is proof of confidence — use it.",
    },
    {
      label: "Do it ourselves", q: '"Why can\'t we just handle this in-house?"',
      avoid: "That's a good point, I guess you could…",
      say: '"You absolutely could — some clinics do. Here\'s what we\'ve found: clinics that try to run BHI internally hit three walls. One — the admin burden of tracking enrollment, appointments, and superbills becomes a full-time job. Two — finding licensed behavioral health staff is expensive and hard to retain. Three — billing management requires expertise most clinic staff don\'t have. We handle all of that. You focus on primary care."',
      note: "This objection usually comes from larger, more operationally sophisticated clinics. Acknowledge the possibility, then show the cost of the alternative.",
    },
  ]

  const obj = objections[active]

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 italic leading-relaxed">
        Objections are not rejections. They&apos;re requests for more information, or signals you need to re-establish value. Welcome them.
      </p>

      <div className="flex flex-wrap gap-2">
        {objections.map((o, i) => (
          <button
            key={o.label}
            onClick={() => setActive(i)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              i === active
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <Card>
        <p className="text-base font-medium text-slate-900 italic mb-4">{obj.q}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Avoid</p>
            <p className="text-xs text-red-700 leading-relaxed">{obj.avoid}</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-4">
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-2">Say instead</p>
            <p className="text-xs text-teal-700 leading-relaxed">{obj.say}</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 mt-3">
          <p className="text-xs text-slate-500 italic leading-relaxed">{obj.note}</p>
        </div>
      </Card>
    </div>
  )
}

function IcpSection() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 italic leading-relaxed">
        Not every clinic is a good fit. Chasing the wrong targets wastes time and lowers your win rate.
      </p>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ideal client profile</h4>
        <Card>
          {[
            { key: "Clinic type", val: "Primary care, OB/GYN, women's health, community health centers, FQHCs" },
            { key: "Size", val: "200+ patients/month — this is where the math becomes compelling" },
            { key: "Awareness", val: "Knows mental health is an issue in their population, but doesn't have a structured solution" },
            { key: "Payer mix", val: "Has some commercial insurance — pure Medicaid clinics have lower reimbursement and tighter margins" },
            { key: "Pain signal", val: "Already referring out for mental health (losing those patients), or seeing more mental health presentations and feeling unprepared" },
            { key: "Decision maker", val: "Owner-physician or clinic director — not an office manager who needs to loop in 5 people" },
          ].map((row) => (
            <div key={row.key} className="flex gap-4 py-2.5 border-b border-slate-100 last:border-0">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-28 flex-shrink-0 pt-0.5">{row.key}</span>
              <span className="text-xs text-slate-700 leading-relaxed">{row.val}</span>
            </div>
          ))}
        </Card>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Lead prioritization</h4>
        <Card>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <Badge color="purple">Tier 1</Badge>
              <div>
                <p className="text-xs font-semibold text-slate-800">Existing referral partners</p>
                <p className="text-xs text-slate-500">Clinics already sending patients to LunaJoy. Call them first: &quot;We have an upgraded program — interested?&quot;</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Badge color="teal">Tier 2</Badge>
              <div>
                <p className="text-xs font-semibold text-slate-800">Femwell & Florida Women&apos;s Care</p>
                <p className="text-xs text-slate-500">Warm introduction via preferred vendor relationship.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Badge color="amber">Tier 3</Badge>
              <div>
                <p className="text-xs font-semibold text-slate-800">Cold outreach — FL primary care & OB/GYN</p>
                <p className="text-xs text-slate-500">Clinics in Florida not yet in the network.</p>
              </div>
            </div>
          </div>
          <RedLine>Do NOT call Unified Florida clinics — these are managed separately. Check with the team before reaching out if unsure.</RedLine>
        </Card>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Key numbers to know cold</h4>
        <div className="grid grid-cols-4 gap-3">
          <Metric label="Avg BHI reimbursement" value="$60" unit="/patient/mo" />
          <Metric label="Max reimbursement" value="$116" unit="/patient/mo" />
          <Metric label="Positive screen rate" value="30%" unit=" of population" />
          <Metric label="BHI enrollment rate" value="50%" unit=" of positive screens" />
        </div>
      </div>
    </div>
  )
}

function ChecklistSection() {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const lists = [
    {
      title: "Before the call",
      items: [
        "Camera on — eye level, clean background, face clearly lit",
        "Know their payer mix (commercial vs Medicaid/Medicare)",
        "Know their approximate patient volume",
        "Know their clinic type and current screening status",
        "Confirmed you are speaking to the decision maker (owner/director)",
        "Set intention: you are there to understand their pain — not to pitch",
      ],
    },
    {
      title: "During the call",
      items: [
        'Opened with context and structure — not a product overview',
        'Keeping one topic at a time (no topic mixing)',
        'Speaking with certainty — no "maybe," "I think," or "hopefully"',
        'Asked about payer mix and patient volume',
        'Doing math with them — not at them',
        'Treating objections as diagnostic signals, not rejections',
        'Structuring out loud when topics get complex',
      ],
    },
    {
      title: "Before ending the call",
      items: [
        "Next step is specific: clear action + owner + date",
        "Confirmed the next step out loud and got verbal agreement",
        'Did NOT end with "feel free to reach out if you have questions"',
        "The prospect feels clearer, more confident, and guided",
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 italic leading-relaxed">
        Print this. Use it before every call. If these boxes aren&apos;t checked, you&apos;re not ready.
      </p>

      {lists.map((list) => (
        <div key={list.title}>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{list.title}</h4>
          <Card>
            <div className="divide-y divide-slate-100">
              {list.items.map((item) => {
                const id = `${list.title}-${item}`
                const on = checked.has(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    className="w-full flex items-start gap-3 py-2.5 text-left hover:bg-slate-50 rounded-lg px-1 transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        on ? "bg-teal-500 border-teal-500" : "border-slate-300 bg-white"
                      }`}
                    >
                      {on && (
                        <svg width="10" height="8" viewBox="0 0 10 8">
                          <polyline points="1,4 4,7 9,1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs leading-relaxed transition-colors ${on ? "text-slate-400 line-through" : "text-slate-600"}`}>
                      {item}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      ))}

      <p className="text-xs text-slate-400">Tap any item to check it off. Checkboxes reset on page refresh.</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────
export default function PlaybookPage() {
  const [activeSection, setActiveSection] = useState<Section>("mission")

  const sectionComponents: Record<Section, React.ReactNode> = {
    mission: <MissionSection />,
    mindset: <MindsetSection />,
    framework: <FrameworkSection />,
    pricing: <PricingSection />,
    objections: <ObjectionsSection />,
    icp: <IcpSection />,
    checklist: <ChecklistSection />,
  }

  const currentSection = SECTIONS.find((s) => s.id === activeSection)
  const groups = [...new Set(SECTIONS.map((s) => s.group))]

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Section nav */}
      <div className="w-56 flex-shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Playbook</h1>
            <p className="text-xs text-slate-500">Sales Consultant Field Guide</p>
          </div>
        </div>

        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-2">
                {group}
              </p>
              <div className="space-y-0.5">
                {SECTIONS.filter((s) => s.group === group).map((s) => {
                  const Icon = s.icon
                  const isActive = s.id === activeSection
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-amber-50 text-amber-700"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-500" : "text-slate-400"}`} />
                      {s.label}
                      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-amber-400" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{currentSection?.label}</h2>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-700">Field Guide</span>
        </div>
        {sectionComponents[activeSection]}
      </div>
    </div>
  )
}
