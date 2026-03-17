"use client";
import { useState, useRef } from "react";
import styles from "./ToolPanel.module.css";

export default function ToolPanel({ toolKey, tool, session }) {
  const [values, setValues] = useState({});
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState([
    { id: 1, text: "", rating: null },
    { id: 2, text: "", rating: null },
  ]);
  const [toast, setToast] = useState(null);
  const [driveModal, setDriveModal] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [calModal, setCalModal] = useState(false);
  const [calEvents, setCalEvents] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [selectedCalEvents, setSelectedCalEvents] = useState(new Set());
  const [gmailModal, setGmailModal] = useState(false);
  const [gmailTo, setGmailTo] = useState("");
  const [gmailSubject, setGmailSubject] = useState("");
  const [gmailBody, setGmailBody] = useState("");
  const [gmailSending, setGmailSending] = useState(false);
  const outRef = useRef(null);

  const showToast = (msg, type = "") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const set = (id, val) => setValues(v => ({ ...v, [id]: val }));
  const get = (id) => values[id] || "";

  const buildPrompt = () => {
    if (tool.isMessages) {
      const msgData = msgs
        .filter(m => m.text.trim())
        .map((m, i) => `Message ${i + 1} (rating: ${m.rating || "?"}/5):\n${m.text}`)
        .join("\n\n");
      return `Analyse these outreach messages ranked by a sales rep:\n\n${msgData}\n\nProvide:\n1. What's working — patterns in the higher-rated messages\n2. What's not working — patterns in the lower-rated messages\n3. A full rewrite of the lowest-rated message\n4. One principle to apply across all messages going forward`;
    }
    return tool.prompt(values);
  };

  const generate = async () => {
    const prompt = buildPrompt();
    if (!prompt.trim()) { showToast("Fill in the form first", "error"); return; }
    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) { setOutput("Error: " + res.statusText); setLoading(false); return; }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setOutput(text);
        if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
      }
    } catch (e) {
      setOutput("Connection error: " + e.message);
    }
    setLoading(false);
  };

  // ── DRIVE ──────────────────────────────────────────────────
  const openDrive = async () => {
    setDriveModal(true);
    setDriveLoading(true);
    setDriveFiles([]);
    setSelectedFile(null);
    setDriveSearch("");
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType!='application/vnd.google-apps.folder'&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,mimeType,modifiedTime)`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (e) { showToast("Drive error: " + e.message, "error"); }
    setDriveLoading(false);
  };

  const importDriveFile = async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFile.id}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      let text;
      if (!res.ok) {
        const res2 = await fetch(
          `https://www.googleapis.com/drive/v3/files/${selectedFile.id}?alt=media`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } }
        );
        text = await res2.text();
      } else {
        text = await res.text();
      }
      set(tool.driveTarget, text.slice(0, 8000));
      setDriveModal(false);
      showToast("Imported: " + selectedFile.name, "success");
    } catch (e) { showToast("Import error: " + e.message, "error"); }
  };

  // ── CALENDAR ───────────────────────────────────────────────
  const openCal = async () => {
    setCalModal(true);
    setCalLoading(true);
    setCalEvents([]);
    setSelectedCalEvents(new Set());
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=20`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      const data = await res.json();
      setCalEvents(data.items || []);
    } catch (e) { showToast("Calendar error: " + e.message, "error"); }
    setCalLoading(false);
  };

  const fillFromCal = () => {
    const toUse = selectedCalEvents.size > 0
      ? calEvents.filter((_, i) => selectedCalEvents.has(i))
      : calEvents;
    const text = toUse.map(ev => {
      const start = ev.start?.dateTime
        ? new Date(ev.start.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "";
      const attendees = (ev.attendees || []).map(a => a.displayName || a.email).filter(Boolean).join(", ");
      return `${start} — ${ev.summary || "Untitled"}${attendees ? " (with: " + attendees + ")" : ""}`;
    }).join("\n");
    set("f1", text);
    setCalModal(false);
    showToast(`Loaded ${toUse.length} event(s) from Calendar`, "success");
  };

  // ── GMAIL ──────────────────────────────────────────────────
  const openGmail = () => {
    const lines = output.split("\n");
    const subjectLine = lines.find(l => l.toLowerCase().startsWith("subject:"));
    const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, "").trim() : "";
    const body = lines.filter(l => !l.toLowerCase().startsWith("subject:")).join("\n").trim();
    setGmailTo(get("f1") || get("gf1") || "");
    setGmailSubject(subject);
    setGmailBody(body || output);
    setGmailModal(true);
  };

  const sendGmail = async () => {
    if (!gmailTo || !gmailSubject || !gmailBody) { showToast("Fill in all fields", "error"); return; }
    setGmailSending(true);
    try {
      const res = await fetch("/api/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: gmailTo, subject: gmailSubject, body: gmailBody }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setGmailModal(false);
      showToast("Email sent via Gmail ✓", "success");
    } catch (e) { showToast("Gmail error: " + e.message, "error"); }
    setGmailSending(false);
  };

  const filteredDrive = driveFiles.filter(f =>
    f.name.toLowerCase().includes(driveSearch.toLowerCase())
  );

  const driveIcon = (mime) => {
    if (mime?.includes("document")) return "📄";
    if (mime?.includes("spreadsheet")) return "📊";
    if (mime?.includes("presentation")) return "📊";
    if (mime?.includes("pdf")) return "📕";
    return "📁";
  };

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.plabel}>
          {tool.isGmailTool ? "Email details" : "Input"}
        </div>

        {/* CALENDAR BUTTON */}
        {tool.hasCalendar && (
          <button className={styles.integBtn} onClick={openCal}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Load from Google Calendar
          </button>
        )}

        {/* DRIVE BUTTON */}
        {tool.hasDrive && (
          <button className={styles.integBtn} onClick={openDrive}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Import from Google Drive
          </button>
        )}

        {/* STANDARD FIELDS */}
        {!tool.isMessages && tool.fields?.map(f => (
          <div className={styles.fg} key={f.id}>
            <div className={styles.fl}>{f.label}</div>
            {f.type === "textarea" ? (
              <textarea rows={f.rows || 3} placeholder={f.placeholder} value={get(f.id)} onChange={e => set(f.id, e.target.value)} />
            ) : f.type === "select" ? (
              <select value={get(f.id) || f.options[0]} onChange={e => set(f.id, e.target.value)}>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type="text" placeholder={f.placeholder} value={get(f.id)} onChange={e => set(f.id, e.target.value)} />
            )}
          </div>
        ))}

        {/* MESSAGE INSIGHTS */}
        {tool.isMessages && (
          <>
            {msgs.map((m, i) => (
              <div className={styles.msgCard} key={m.id}>
                <div className={styles.msgTop}>
                  <span className={styles.msgNum}>MSG {i + 1}</span>
                  <button className={styles.rmBtn} onClick={() => setMsgs(msgs.filter((_, j) => j !== i))}>remove</button>
                </div>
                <textarea rows={3} placeholder="Paste the outreach message here…" value={m.text} onChange={e => setMsgs(msgs.map((msg, j) => j === i ? { ...msg, text: e.target.value } : msg))} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={styles.fl}>Rating:</span>
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} className={`${styles.star} ${m.rating === v ? styles.starOn : ""}`} onClick={() => setMsgs(msgs.map((msg, j) => j === i ? { ...msg, rating: v } : msg))}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button className={styles.addMsg} onClick={() => setMsgs([...msgs, { id: Date.now(), text: "", rating: null }])}>+ Add message</button>
          </>
        )}

        <button className={`${styles.gbtn} ${tool.isGmailTool ? styles.gbtnGmail : ""}`} onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className={styles.panel}>
        <div className={styles.plabel}>Output</div>
        <div className={`${styles.out} ${!output ? styles.ph : ""} ${loading ? styles.live : ""}`} ref={outRef}>
          {output || "Output will appear here…"}
        </div>
        <div className={styles.arow}>
          <button className={styles.abtn} onClick={() => { if (output) { navigator.clipboard.writeText(output); showToast("Copied!", "success"); } }}>Copy</button>
          {(tool.hasGmail || tool.isGmailTool) && output && (
            <button className={styles.abtn} onClick={openGmail}>Send via Gmail</button>
          )}
          <button className={styles.abtn} onClick={() => setOutput("")}>Clear</button>
        </div>
      </div>

      {/* DRIVE MODAL */}
      {driveModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setDriveModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>📁 Import from Google Drive</span>
              <button className={styles.modalClose} onClick={() => setDriveModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <input className={styles.modalSearch} placeholder="Search files…" value={driveSearch} onChange={e => setDriveSearch(e.target.value)} />
              <div className={styles.modalList}>
                {driveLoading
                  ? <div className={styles.modalEmpty}>Loading Drive…</div>
                  : filteredDrive.length === 0
                    ? <div className={styles.modalEmpty}>No files found</div>
                    : filteredDrive.map(f => (
                      <div key={f.id} className={`${styles.modalItem} ${selectedFile?.id === f.id ? styles.selectedItem : ""}`} onClick={() => setSelectedFile(f)}>
                        <span className={styles.modalIcon}>{driveIcon(f.mimeType)}</span>
                        <div>
                          <div className={styles.modalItemName}>{f.name}</div>
                          <div className={styles.modalItemMeta}>{f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString("pt-BR") : ""}</div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.abtn} onClick={() => setDriveModal(false)}>Cancel</button>
              <button className={styles.gbtn} onClick={importDriveFile} disabled={!selectedFile}>Import selected</button>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR MODAL */}
      {calModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setCalModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>📅 Today's Calendar</span>
              <button className={styles.modalClose} onClick={() => setCalModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalList}>
                {calLoading
                  ? <div className={styles.modalEmpty}>Loading calendar…</div>
                  : calEvents.length === 0
                    ? <div className={styles.modalEmpty}>No events today</div>
                    : calEvents.map((ev, i) => {
                      const start = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "All day";
                      const end = ev.end?.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
                      return (
                        <div key={i} className={`${styles.modalItem} ${selectedCalEvents.has(i) ? styles.selectedItem : ""}`}
                          onClick={() => {
                            const s = new Set(selectedCalEvents);
                            s.has(i) ? s.delete(i) : s.add(i);
                            setSelectedCalEvents(s);
                          }}>
                          <span className={styles.modalIcon}>📅</span>
                          <div>
                            <div className={styles.modalItemName}>{ev.summary || "Untitled event"}</div>
                            <div className={styles.modalItemMeta}>{start}{end ? " – " + end : ""}</div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.abtn} onClick={() => setCalModal(false)}>Cancel</button>
              <button className={styles.gbtn} onClick={fillFromCal}>Auto-fill briefing</button>
            </div>
          </div>
        </div>
      )}

      {/* GMAIL MODAL */}
      {gmailModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setGmailModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>📧 Send via Gmail</span>
              <button className={styles.modalClose} onClick={() => setGmailModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fg} style={{ marginBottom: 10 }}>
                <div className={styles.fl}>To</div>
                <input type="text" value={gmailTo} onChange={e => setGmailTo(e.target.value)} placeholder="recipient@example.com" />
              </div>
              <div className={styles.fg} style={{ marginBottom: 10 }}>
                <div className={styles.fl}>Subject</div>
                <input type="text" value={gmailSubject} onChange={e => setGmailSubject(e.target.value)} placeholder="Email subject" />
              </div>
              <div className={styles.fg}>
                <div className={styles.fl}>Body</div>
                <textarea rows={8} value={gmailBody} onChange={e => setGmailBody(e.target.value)} style={{ resize: "vertical" }} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.abtn} onClick={() => setGmailModal(false)}>Cancel</button>
              <button className={styles.gbtn} onClick={sendGmail} disabled={gmailSending}>{gmailSending ? "Sending…" : "Send email"}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : toast.type === "error" ? styles.toastError : ""}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
