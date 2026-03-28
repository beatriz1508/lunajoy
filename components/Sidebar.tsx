"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Mic2,
  Lightbulb,
  BookOpen,
  GraduationCap,
  History,
  Menu,
  X,
  User,
} from "lucide-react"
import { SEED_USER } from "@/lib/seedData"
import { getItem } from "@/lib/storage"
import { useEffect } from "react"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/copilot", label: "Copilot", icon: Mic2 },
  { href: "/brainstorm", label: "Brainstorm", icon: Lightbulb },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/history", label: "History", icon: History },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState(SEED_USER)

  useEffect(() => {
    setUser(getItem("user", SEED_USER))
  }, [])

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
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-purple-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            {user.name}
          </p>
          <p className="text-xs text-slate-500">
            Lv.{user.level} · {user.levelName}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white z-30">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">SC</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm leading-tight">
            Sales Consultant
          </span>
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
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
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
