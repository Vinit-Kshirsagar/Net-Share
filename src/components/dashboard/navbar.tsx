'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Network, Radio, LogOut, ShieldCheck, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavbarProps {
  userEmail: string
  userId: string
}

const NAV_LINKS = [
  { href: '/files', label: 'File Storage' },
  { href: '/network', label: 'Network Telemetry' },
  { href: '/protocols', label: 'Protocol Explorer' },
  { href: '/lab', label: 'Socket Laboratory' },
]

export function DashboardNavbar({ userEmail, userId }: NavbarProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
        {/* Brand & Radar */}
        <div className="flex items-center space-x-8 lg:space-x-12 shrink-0">
          <Link href="/files" className="flex items-center space-x-3 group shrink-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-black tracking-tightest text-white uppercase whitespace-nowrap leading-none">
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

          {/* Nav links */}
          <div className="hidden md:flex items-center space-x-8 lg:space-x-10 shrink-0">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'text-[13px] font-bold tracking-tight transition-all whitespace-nowrap relative py-2',
                    isActive ? 'text-white' : 'text-white/40 hover:text-white'
                  )}
                >
                  {label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full animate-in slide-in-from-bottom-1 duration-300" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right action area: Security badge, User profile & Sign Out */}
        <div className="flex items-center space-x-3 sm:space-x-5 shrink-0">
          {/* Status pill */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-white uppercase tracking-widest">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Systems Nominal</span>
          </div>

          {/* User namespace indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
            <div className="w-5 h-5 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="font-mono text-[11px] text-white/80 max-w-[140px] truncate" title={userEmail}>
              {userEmail}
            </span>
          </div>

          {/* Sign out */}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-[11px] font-black text-white/40 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10 px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile nav drawer strip */}
      <div className="md:hidden flex items-center justify-around border-t border-white/[0.06] px-4 py-2 bg-[#080808]/95 overflow-x-auto">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider px-2 py-1 whitespace-nowrap',
                isActive ? 'text-white border-b border-white' : 'text-white/40'
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
