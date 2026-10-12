'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Activity, Shield, Wifi, Cpu, Clock } from 'lucide-react'

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/files': {
    title: 'File Manager',
    subtitle: 'Direct-to-storage file operations & SHA-256 verification',
  },
  '/network': {
    title: 'Network Activity & Metrics',
    subtitle: 'Real-time HTTP operation telemetry & throughput graphs',
  },
  '/protocols': {
    title: 'Protocol Explorer',
    subtitle: 'Interactive L7 to L3 networking layers and lifecycle',
  },
  '/lab': {
    title: 'Networking Lab',
    subtitle: 'Controlled payload experiments & Python TCP socket lab',
  },
}

export function DashboardHeader() {
  const pathname = usePathname()
  const current = TITLES[pathname] || {
    title: 'NetShare',
    subtitle: 'Network File Server & Protocol Explorer',
  }

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-base font-semibold text-white tracking-tight leading-none">
          {current.title}
        </h2>
        <p className="text-xs text-slate-400 mt-1 hidden sm:block">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
          <Clock className="h-3 w-3 text-blue-400" />
          <span className="font-mono text-[11px]">performance.now()</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-[11px]">
          <Shield className="h-3 w-3" />
          <span>HTTPS / TLS 1.3</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Telemetry Active</span>
        </div>
      </div>
    </header>
  )
}
