"use client";
import { useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { TOOLS, NAV_GROUPS } from "../lib/tools";
import ToolPanel from "./ToolPanel";
import GeminiPanel from "./GeminiPanel";
import styles from "./AppShell.module.css";

export default function AppShell({ session }) {
  const [current, setCurrent] = useState("briefing");
  const tool = TOOLS[current];

  return (
    <div className={styles.shell}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.brand}>SALES // AI</div>
        <div className={styles.spacer} />
        <div className={styles.userArea}>
          <div className={styles.gBadge}>
            <span className={styles.gDot} title="Calendar" />
            <span className={styles.gDot} title="Drive" />
            <span className={styles.gDot} title="Gmail" />
          </div>
          {session.user.image
            ? <img className={styles.avatar} src={session.user.image} alt="" referrerPolicy="no-referrer" />
            : <div className={styles.avatarFallback}>{session.user.name?.[0]?.toUpperCase() || "U"}</div>
          }
          <div className={styles.userInfo}>
            <div className={styles.userName}>{session.user.name}</div>
            <button className={styles.signOut} onClick={() => signOut({ callbackUrl: "/login" })}>sign out</button>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* SIDEBAR */}
        <nav className={styles.nav}>
          {NAV_GROUPS.map(group => {
            const items = Object.entries(TOOLS).filter(([, t]) => t.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className={styles.navGroup}>{group}</div>
                {items.map(([key, t]) => (
                  <div
                    key={key}
                    className={`${styles.ni} ${current === key ? styles.active : ""} ${group === "Google" ? styles.googleItem : ""}`}
                    onClick={() => setCurrent(key)}
                  >
                    <span className={styles.niDot} />
                    {t.title}
                    {group === "Google" && <span className={styles.niBadge}>G</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </nav>

        {/* MAIN */}
        <div className={styles.main}>
          <div className={styles.thead}>
            <div className={styles.theadInfo}>
              <div className={styles.theadTitle}>{tool.title}</div>
              <div className={styles.theadDesc}>{tool.desc}</div>
            </div>
          </div>
          <div className={styles.tcontent}>
            {tool.isGemini
              ? <GeminiPanel session={session} />
              : <ToolPanel key={current} toolKey={current} tool={tool} session={session} />
            }
          </div>
        </div>
      </div>
    </div>
  );
}
