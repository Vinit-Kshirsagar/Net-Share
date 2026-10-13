'use client'

import React, { useState, useTransition, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, ArrowRight, AlertCircle, UserCheck, Network } from 'lucide-react'
import {
  ProtocolInspectorModal,
  ProtocolInspectionContext,
} from '@/components/network/protocol-inspector-modal'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/files'
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState(
    errorParam === 'auth_callback_failed' ? 'Authentication callback failed. Please try signing in again.' : ''
  )
  const [isPending, startTransition] = useTransition()

  // Protocol Inspector state
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [protocolCtx, setProtocolCtx] = useState<ProtocolInspectionContext | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.')
      return
    }

    startTransition(async () => {
      try {
        const supabase = createClient()
        const authStart = performance.now()
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        const durationMs = performance.now() - authStart

        if (error) {
          setErrorMessage(error.message)
          return
        }

        // Show auth protocol inspector before navigating
        setProtocolCtx({
          userEmail: email.trim(),
          durationMs,
          statusCode: 200,
        })
        setProtocolOpen(true)

        // Navigate after a brief moment so the user sees the modal
        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 400)
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
      }
    })
  }

  // Quick fill demo credentials
  const fillTestAccount = (userEmail: string) => {
    setEmail(userEmail)
    setPassword('TestPassword123!')
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Eyebrow & Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-white uppercase tracking-[0.3em] shadow-xl">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <span>Storage Node v2.5 Synchronized</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tightest leading-tight text-white">
          Sign in to <span className="text-white/40 italic">NetShare OS.</span>
        </h1>
        <p className="text-sm font-medium text-white/50 max-w-sm mx-auto leading-relaxed">
          Access your private cryptographic storage namespace with monotonic telemetry observability.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="linear-card p-6 sm:p-8 space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-xs font-medium text-red-400 animate-in fade-in">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@netshare.lab"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 text-sm font-medium transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 text-sm font-medium transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="linear-button-primary w-full h-12 rounded-xl text-black font-black text-[13px] uppercase tracking-wider mt-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                Sign In to Namespace <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick-Fill Section */}
        <div className="pt-5 border-t border-white/[0.08] space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase tracking-widest">
            <UserCheck className="h-3 w-3 text-white/70" />
            <span>Evaluator & Viva Quick Fill</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fillTestAccount('user_a@netshare.lab')}
              className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/30 hover:bg-white/[0.05] text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-white group-hover:text-white">User A (Primary)</div>
              <div className="text-[10px] text-white/40 font-mono mt-0.5 truncate">user_a@netshare.lab</div>
            </button>
            <button
              type="button"
              onClick={() => fillTestAccount('user_b@netshare.lab')}
              className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/30 hover:bg-white/[0.05] text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-white group-hover:text-white">User B (Isolation)</div>
              <div className="text-[10px] text-white/40 font-mono mt-0.5 truncate">user_b@netshare.lab</div>
            </button>
          </div>
        </div>

        {/* Protocol Inspector link for auth curiosity */}
        <div className="pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setProtocolCtx({ userEmail: email || 'user@netshare.lab', statusCode: 200 })
              setProtocolOpen(true)
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-all"
          >
            <Network className="h-3.5 w-3.5" />
            What happens during sign-in? → Inspect Auth Protocols
          </button>
        </div>
      </div>

      {/* Switch to Register */}
      <div className="text-center text-xs text-white/40">
        Need to register a fresh storage namespace?{' '}
        <Link href="/register" className="text-white hover:underline underline-offset-4 font-bold ml-1">
          Create an account →
        </Link>
      </div>

      {/* Protocol Inspector Modal */}
      <ProtocolInspectorModal
        open={protocolOpen}
        onOpenChange={setProtocolOpen}
        initialOperation="auth"
        contextData={protocolCtx}
      />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="linear-card p-12 text-center text-white/40">
          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs uppercase tracking-widest font-bold">Synchronizing NetShare...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
