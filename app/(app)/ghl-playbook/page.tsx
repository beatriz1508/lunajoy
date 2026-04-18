"use client"

import { useState } from "react"
import {
  FileText,
  CalendarCheck,
  Phone,
  Users,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  ChevronRight,
  CheckCircle2,
  Info,
} from "lucide-react"

type Section =
  | "daily"
  | "calls"
  | "clinics"
  | "data"
  | "lifecycle"
  | "activity"

const SECTIONS: { id: Section; label: string; icon: React.ElementType; group: string }[] = [
  { id: "daily", label: "Daily Routine", icon: CalendarCheck, group: "Daily" },
  { id: "calls", label: "Making Calls", icon: Phone, group: "Core Workflow" },
  { id: "clinics", label: "Clinic Selection", icon: Users, group: "Outreach" },
  { id: "data", label: "Data Quality", icon: AlertTriangle, group: "Data & Status" },
  { id: "lifecycle", label: "Clinic Lifecycle", icon: BarChart3, group: "Data & Status" },
  { id: "activity", label: "Activity Log", icon: ClipboardList, group: "Data & Status" },
]

// ─── Reusable components ──────────────────────────────────────────────
function Card({
  children,
  accent,
  className = "",
}: {
  children: React.ReactNode
  accent?: "teal" | "amber" | "red" | "purple" | "indigo" | "orange"
  className?: string
}) {
  const border = accent
    ? {
        teal: "border-l-4 border-l-teal-400",
        amber: "border-l-4 border-l-amber-400",
        red: "border-l-4 border-l-red-400",
        purple: "border-l-4 border-l-purple-400",
        indigo: "border-l-4 border-l-indigo-400",
        orange: "border-l-4 border-l-orange-400",
      }[accent]
    : ""
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${border} ${className}`}>
      {children}
    </div>
  )
}

function StatusPill({ color, children }: { color: "green" | "yellow" | "red" | "grey"; children: React.ReactNode }) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    grey: "bg-slate-100 text-slate-500 border-slate-200",
  }
  return (
    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${styles[color]}`}>
      {children}
    </span>
  )
}

function PathBreadcrumb({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 my-3">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-orange-400" />}
          <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">{item}</span>
        </span>
      ))}
    </div>
  )
}

function Callout({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="bg-orange-50 border-l-3 border-l-orange-400 rounded-r-lg p-4 mt-4">
      <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider mb-1">{tag}</p>
      <p className="text-sm text-slate-700 leading-relaxed italic">{children}</p>
    </div>
  )
}

function StepItem({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="mb-4">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-orange-600">
            {String(number).padStart(2, "0")}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 mb-2">{title}</h3>
          {children}
        </div>
      </div>
    </Card>
  )
}

function PlaceholderSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-4">
      <Card accent="amber">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-amber-500" />
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Coming soon</p>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          This section will cover {title.toLowerCase()}. Content is being prepared.
        </p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="text-orange-400 font-mono text-xs mt-0.5">&mdash;</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Section: Daily Routine ──────────────────────────────────────────
function DailyRoutineSection() {
  return (
    <PlaceholderSection
      title="the daily rhythm of a sales rep inside GHL"
      items={[
        "Morning check-in \u2014 pipeline review",
        "Daily outreach targets",
        "Midday follow-up pass",
        "End-of-day clean-up and logging",
      ]}
    />
  )
}

// ─── Section: Making Calls (main content) ────────────────────────────
function MakingCallsSection() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 italic leading-relaxed">
        Every call lives or dies by how it&apos;s logged. This section walks through the full loop &mdash; from finding the number, to pressing call, to closing the note &mdash; so every touch stays clean in the system.
      </p>

      {/* Step 1 */}
      <StepItem number={1} title="Start from the pipeline \u2014 pick the opportunity">
        <p className="text-sm text-slate-600 leading-relaxed mb-2">
          Every outreach begins in the <strong>pipeline</strong>, not in the contacts list. The pipeline is where your live opportunities sit. Always open the opportunity first &mdash; that&apos;s what keeps the call tied to the right deal, at the right stage, with the right context.
        </p>
        <PathBreadcrumb items={["Opportunities", "Pipeline", "Click the opportunity card"]} />
        <div className="space-y-2 mt-3">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Open the <strong>Opportunities</strong> view and select the pipeline.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Find the opportunity card for the clinic you&apos;re about to call.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Click the card &mdash; this links you to the associated contact.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Only from <em>inside the opportunity</em> should you move on and dial.</span>
          </div>
        </div>
        <Callout tag="Why this matters">
          If you skip the pipeline and call from the contacts list, the call may get logged against the contact but not attached to the opportunity your manager tracks. The deal effectively looks untouched.
        </Callout>
      </StepItem>

      {/* Step 2 */}
      <StepItem number={2} title="Find the phone number inside the contact">
        <p className="text-sm text-slate-600 leading-relaxed mb-2">
          Don&apos;t dial from memory or a spreadsheet &mdash; always pull the number directly from GHL so the call logs attach to the right contact.
        </p>
        <PathBreadcrumb items={["Contacts", "Open contact", "Phone field"]} />
        <div className="space-y-2 mt-3">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Open the contact from your pipeline or search bar.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Locate the <strong>Phone</strong> field in the left info panel.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>If the number looks wrong (wrong country code, missing digits), <strong>do not call</strong> &mdash; go to Data Quality section.</span>
          </div>
        </div>
      </StepItem>

      {/* Step 3 */}
      <StepItem number={3} title="Hit the call button on the contact">
        <p className="text-sm text-slate-600 leading-relaxed mb-2">
          GHL has a built-in dialer. Always call from inside the contact &mdash; never from your personal phone. If you call externally, the activity log won&apos;t capture it.
        </p>
        <div className="space-y-2 mt-3">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Inside the contact, click the <strong>phone icon</strong> next to the number.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>The GHL dialer opens in a side panel.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Confirm the outbound caller ID is correct, then press <strong>Call</strong>.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Keep the dialer open for the entire conversation &mdash; closing it mid-call can break the log.</span>
          </div>
        </div>
        <Callout tag="Reminder">
          {`If you don't hear a dial tone within 5 seconds, check your headset permissions in the browser. Refresh the page if needed \u2014 but before you dial, not during.`}
        </Callout>
      </StepItem>

      {/* Step 4 */}
      <StepItem number={4} title="Set the Call Outcome">
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          Call Outcome tells the system <strong>what actually happened on the call.</strong> Set this immediately after hanging up, while it&apos;s fresh.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <StatusPill color="green">answered</StatusPill>
          <StatusPill color="yellow">voicemail</StatusPill>
          <StatusPill color="grey">didn&apos;t answer</StatusPill>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>answered</strong> &mdash; someone picked up and you spoke with them, regardless of the content.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>voicemail</strong> &mdash; the call went to voicemail. Always leave a short, clear message on a first attempt.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>didn&apos;t answer</strong> &mdash; the phone rang out with no pickup and no voicemail option.</span>
          </div>
        </div>
        <Callout tag="Don&apos;t skip">
          Call Outcome is the single most important field for reporting. An empty outcome means the call &quot;didn&apos;t happen&quot; as far as the dashboard is concerned.
        </Callout>
      </StepItem>

      {/* Step 5 */}
      <StepItem number={5} title="Set the Follow up">
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          The <strong>Follow up</strong> field tracks the email side of the outreach, completely separate from the call itself. Fill it in right after Call Outcome.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <StatusPill color="yellow">send email</StatusPill>
          <StatusPill color="green">email sent</StatusPill>
          <StatusPill color="grey">no email available</StatusPill>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>send email</strong> &mdash; a reminder that you still owe the follow-up email.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>email sent</strong> &mdash; flip to this the moment the email actually leaves your outbox. Don&apos;t mark it in advance.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>no email available</strong> &mdash; the contact has no email on file. Don&apos;t guess or scrape one without verification.</span>
          </div>
        </div>
        <Callout tag="Rhythm">
          {`Every call typically ends with an email. "send email" is your to-do; "email sent" is your receipt. Never leave the field empty.`}
        </Callout>
      </StepItem>

      {/* Step 6 */}
      <StepItem number={6} title="Update the Outreach Status">
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          Outreach Status is <strong>where the clinic sits in your pipeline</strong> after this interaction. Where Call Outcome answers &quot;what just happened?&quot;, Outreach Status answers &quot;what&apos;s the state of this lead now?&quot;
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <StatusPill color="red">not interested</StatusPill>
          <StatusPill color="yellow">could not outreach</StatusPill>
          <StatusPill color="grey">clinic closed</StatusPill>
          <StatusPill color="green">interested/need follow up</StatusPill>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>not interested</strong> &mdash; the clinic gave an explicit &quot;no&quot;. Only when it&apos;s a clear decline.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>could not outreach</strong> &mdash; something blocked the outreach (no pickup, number failing, gatekeeper).</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>clinic closed</strong> &mdash; permanently shut down. Worth double-checking before flagging.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-orange-400 font-mono text-xs mt-0.5">&bull;</span>
            <span><strong>interested/need follow up</strong> &mdash; there&apos;s a real opening. Always pair with a follow-up task.</span>
          </div>
        </div>
        <Callout tag="Pick the state, not the story">
          Outreach Status reflects where the lead is now, not where you hope it goes. Keep it honest &mdash; the pipeline only works when everyone does.
        </Callout>
      </StepItem>

      {/* Step 7 */}
      <StepItem number={7} title="Write the note">
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          Notes are the memory of the team. Anyone picking up this lead tomorrow should understand the state of the relationship from the last three notes alone.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          A good note answers three questions:
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-orange-600">1</span>
            <span><strong>Who did you speak to?</strong> Name, role if possible.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-orange-600">2</span>
            <span><strong>What did they say?</strong> Their pain, objection, or interest &mdash; their words, not yours.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-orange-600">3</span>
            <span><strong>What&apos;s next?</strong> The specific next action and when.</span>
          </div>
        </div>
        <Callout tag="Example">
          {`"Spoke with Dr. Marta (clinic owner). Says she's evaluating two other vendors this month. Open to a demo after the 20th. Following up via email today, call again next Tuesday."`}
        </Callout>
        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-2 text-sm text-slate-500">
            <span className="text-red-400 font-mono text-xs mt-0.5">&times;</span>
            <span>Never write &quot;called, no answer&quot; &mdash; that&apos;s what Outcome Status is for.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-500">
            <span className="text-red-400 font-mono text-xs mt-0.5">&times;</span>
            <span>Never write vague entries like &quot;good call, promising.&quot; Specifics or nothing.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Tag teammates with <strong>@name</strong> if you need their attention.</span>
          </div>
        </div>
      </StepItem>

      {/* Step 8 */}
      <StepItem number={8} title="Check the call log">
        <p className="text-sm text-slate-600 leading-relaxed mb-2">
          Before moving to the next contact, glance at the call log to confirm the call was captured. If it didn&apos;t register, your note and statuses float orphaned from the actual audio.
        </p>
        <PathBreadcrumb items={["Contact", "Activity tab", "Calls"]} />
        <div className="space-y-2 mt-3">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Open the contact&apos;s <strong>Activity</strong> tab.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Filter by <strong>Calls</strong>.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Confirm: date, duration, direction (outbound), and a playback link.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>If missing, leave a note manually and flag your manager &mdash; don&apos;t re-dial just to &quot;force&quot; a log.</span>
          </div>
        </div>
        <Callout tag="Rule of thumb">
          {`If it's not in the log, it didn't happen. If it's in the log with no note, it might as well not have happened.`}
        </Callout>
      </StepItem>
    </div>
  )
}

// ─── Section: Clinic Selection ───────────────────────────────────────
function ClinicSelectionSection() {
  return (
    <PlaceholderSection
      title="the prioritization logic for selecting clinics"
      items={[
        "Which filters/saved views to start from",
        "Priority tiers (A / B / C)",
        "Time-zone handling",
        "When to pass a lead to another rep",
      ]}
    />
  )
}

// ─── Section: Data Quality ───────────────────────────────────────────
function DataQualitySection() {
  return (
    <PlaceholderSection
      title="how to flag, correct, and escalate data issues"
      items={[
        "How to flag a wrong phone number",
        "How to correct a clinic name",
        "When to merge vs. delete a duplicate",
        "Who to notify for verified errors",
      ]}
    />
  )
}

// ─── Section: Clinic Lifecycle ───────────────────────────────────────
function ClinicLifecycleSection() {
  return (
    <PlaceholderSection
      title="every possible clinic status and transition rules"
      items={[
        "Full list of statuses",
        "Transition rules (when to move forward / backward)",
        "SLA per status",
        "Automation triggers tied to each status",
      ]}
    />
  )
}

// ─── Section: Activity Log ───────────────────────────────────────────
function ActivityLogSection() {
  return (
    <PlaceholderSection
      title="how to navigate and read the activity log"
      items={[
        "Where to open the activity log",
        "How to filter by rep, date, action",
        "How to interpret event types",
        "What to do when an activity is missing",
      ]}
    />
  )
}

// ─── Main page ────────────────────────────────────────────────────────
export default function GhlPlaybookPage() {
  const [activeSection, setActiveSection] = useState<Section>("calls")

  const sectionComponents: Record<Section, React.ReactNode> = {
    daily: <DailyRoutineSection />,
    calls: <MakingCallsSection />,
    clinics: <ClinicSelectionSection />,
    data: <DataQualitySection />,
    lifecycle: <ClinicLifecycleSection />,
    activity: <ActivityLogSection />,
  }

  const currentSection = SECTIONS.find((s) => s.id === activeSection)
  const groups = [...new Set(SECTIONS.map((s) => s.group))]

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Section nav */}
      <div className="w-56 flex-shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">GHL Playbook</h1>
            <p className="text-xs text-slate-500">Sales Rep Handbook</p>
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
                          ? "bg-orange-50 text-orange-700"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-orange-500" : "text-slate-400"}`} />
                      {s.label}
                      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-orange-400" />}
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
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-orange-50 text-orange-700">GHL Handbook</span>
        </div>
        {sectionComponents[activeSection]}
      </div>
    </div>
  )
}
