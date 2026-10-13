import React from 'react'
import Link from 'next/link'
import { Network, Radio, ShieldCheck, Activity, Terminal } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#080808] text-white relative selection:bg-[#5e6ad2]/40 selection:text-white overflow-hidden">
      {/* Background ambient radial glow & linear grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025] linear-grid z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[55%] h-[55%] bg-white/[0.03] rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-white/[0.03] rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Top Navbar matching compliance-checker */}
      <nav className="relative z-10 w-full border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <Link href="/login" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-black tracking-tightest text-white uppercase leading-none">
                NetShare OS
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Radio className="w-2.5 h-2.5 text-white/40" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
                  Telemetry Radar Active
                </span>
              </div>
            </div>
          </Link>

          <div className="hidden sm:flex items-center space-x-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            <span className="flex items-center gap-1.5 text-white/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              RLS Isolated
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-white/60">
              <Activity className="w-3.5 h-3.5 text-white" />
              Monotonic Telemetry
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-white/60">
              <Terminal className="w-3.5 h-3.5 text-white/80" />
              TCP Protocol Lab
            </span>
          </div>
        </div>
      </nav>

      {/* Main Form Center Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-lg mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 px-8 border-t border-white/[0.08] bg-[#080808]/40 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-white/40">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase tracking-tight">NetShare</span>
            <span>—</span>
            <span>Computer Networks Lab Infrastructure</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            TLS 1.3 · SHA-256 Verified · RFC 9110 HTTP/1.1
          </div>
        </div>
      </footer>
    </div>
  )
}
