"use client";
import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".1em" }}>
        LOADING…
      </div>
    );
  }

  if (!session) return null;

  return <AppShell session={session} />;
}
