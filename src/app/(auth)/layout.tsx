import React from 'react'
import Link from 'next/link'
import { Network, ShieldCheck, Activity, Terminal } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-lg text-white hover:opacity-90 transition-opacity">
          <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">NetShare</span>
            <span className="text-xs ml-2 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">CN Lab</span>
          </div>
        </Link>
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> RLS Isolated</span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-blue-400" /> Monotonic Telemetry</span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1"><Terminal className="h-3.5 w-3.5 text-amber-400" /> TCP Protocol Lab</span>
        </div>
      </header>

      {/* Main card area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 px-6 border-t border-slate-900 text-center text-xs text-slate-500">
        NetShare • Computer Networks Mini Project • Network File Server & Protocol Explorer
      </footer>
    </div>
  )
}
