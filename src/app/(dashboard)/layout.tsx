import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNavbar } from '@/components/dashboard/navbar'

export const instant = false

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col relative selection:bg-[#5e6ad2]/40 selection:text-white">
      {/* Background ambient lighting & grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025] linear-grid z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.025] rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.025] rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Top Fixed Navbar */}
      <DashboardNavbar
        userEmail={user.email ?? 'authenticated_user'}
        userId={user.id}
      />

      {/* Main Content Area */}
      <main className="flex-1 pt-24 sm:pt-28 pb-20 px-6 sm:px-8 max-w-[1400px] w-full mx-auto relative z-10 animate-fade-in">
        {children}
      </main>

      {/* Modern Footer matching compliance-checker */}
      <footer className="border-t border-white/[0.08] bg-[#080808]/60 backdrop-blur-md relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tightest uppercase text-white text-[13px]">NetShare OS</span>
            <span className="text-white/20">•</span>
            <span className="text-white/40 font-medium">Computer Networks Lab Project · L7-L3 Architecture</span>
          </div>
          <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-white/40">
            <span>TLS 1.3 Active</span>
            <span className="text-white/20">•</span>
            <span>SHA-256 Verified</span>
            <span className="text-white/20">•</span>
            <span>RLS Enforced</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
