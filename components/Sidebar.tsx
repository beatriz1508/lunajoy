"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Mic2,
  Lightbulb,
  BookOpen,
  GraduationCap,
  History,
  CalendarDays,
  Mail,
  Menu,
  X,
  LogOut,
  BookMarked,
  FileText,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/db/profile"
import { NotificationBell } from "@/components/NotificationBell"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/copilot", label: "Copilot", icon: Mic2 },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/brainstorm", label: "Brainstorm", icon: Lightbulb },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/playbook", label: "Playbook", icon: BookMarked },
  { href: "/ghl-playbook", label: "GHL Playbook", icon: FileText },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/history", label: "History", icon: History },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get avatar from OAuth metadata
      setAvatarUrl(user.user_metadata?.avatar_url ?? null)

      // Get profile (XP, level)
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
      if (data) setProfile(data)
    }

    loadUser()

    // Refresh profile when it changes (e.g. after XP update)
    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => setProfile(payload.new as Profile)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/")

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-purple-50 text-purple-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 flex-shrink-0",
                active ? "text-purple-600" : "text-slate-400"
              )}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const UserFooter = () => (
    <div className="px-3 py-4 border-t border-slate-200">
      <div className="flex items-center gap-3 px-3 py-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-purple-600">
              {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 truncate">
            {profile?.full_name ?? "Loading…"}
          </p>
          <p className="text-xs text-slate-500">
            Lv.{profile?.level ?? 1} · {profile?.level_name ?? "Rookie"}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex-shrink-0"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white z-30">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">SC</span>
            </div>
            <span className="font-semibold text-slate-800 text-sm leading-tight">
              Sales Consultant
            </span>
          </div>
          <NotificationBell />
        </div>
        <NavLinks />
        <UserFooter />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-slate-200 bg-white z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">SC</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm">
            Sales Consultant
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/20"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute left-0 top-14 bottom-0 w-64 bg-white border-r border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <NavLinks onClose={() => setMobileOpen(false)} />
            <UserFooter />
          </div>
        </div>
      )}
    </>
  )
}
