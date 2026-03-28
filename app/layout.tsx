import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/Sidebar"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sales Consultant Platform",
  description: "Internal tool to evolve your sales team from reps to consultants",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Sidebar />
        {/* Desktop: offset for sidebar; Mobile: offset for top bar */}
        <main className="md:pl-64 pt-14 md:pt-0 min-h-screen bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
