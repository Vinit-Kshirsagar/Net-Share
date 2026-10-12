'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FolderOpen,
  Activity,
  Layers,
  Terminal,
  LogOut,
  ShieldCheck,
  HardDrive,
  Network
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userEmail: string
  userId: string
}

const NAV_ITEMS = [
  {
    name: 'File Manager',
    href: '/files',
    icon: FolderOpen,
    description: 'Personal storage & folders',
  },
  {
    name: 'Network Dashboard',
    href: '/network',
    icon: Activity,
    description: 'Measured transfer telemetry',
  },
  {
    name: 'Protocol Explorer',
    href: '/protocols',
    icon: Layers,
    description: 'L7 to L3 networking layers',
  },
  {
    name: 'Networking Lab',
    href: '/lab',
    icon: Terminal,
    description: 'Controlled experiments & TCP lab',
  },
]

export function DashboardSidebar({ userEmail, userId }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-xl flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80">
          <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">NetShare</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Network File Server</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Modules
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                <div className="truncate">
                  <div className="leading-tight">{item.name}</div>
                  <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User profile & isolation banner */}
      <div className="p-3 border-t border-slate-800/80 space-y-3">
        <div className="px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>RLS Protected Namespace</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate" title={userId}>
            UUID: {userId.substring(0, 16)}...
          </div>
        </div>

        {/* User bar & sign out */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-semibold text-blue-300 shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate" title={userEmail}>
                {userEmail}
              </p>
            </div>
          </div>

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
