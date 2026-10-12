'use client'

import React, { useState, useTransition, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, ArrowRight, AlertCircle, UserCheck } from 'lucide-react'

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
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) {
          setErrorMessage(error.message)
          return
        }

        router.push(redirectTo)
        router.refresh()
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
      }
    })
  }

  // Helper for quick testing of two-account isolation during viva/evaluation
  const fillTestAccount = (userEmail: string) => {
    setEmail(userEmail)
    setPassword('TestPassword123!')
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      <div className="space-y-2 mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Sign In to NetShare</h1>
        <p className="text-sm text-slate-400">
          Enter your credentials to access your private storage namespace and network telemetry.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-sm text-red-400 animate-in fade-in">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
        >
          {isPending ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Sign In <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Test Account Quick-Fill Helper (for Project Evaluation & Demo) */}
      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
          <UserCheck className="h-3.5 w-3.5 text-blue-400" />
          <span>Demo / Evaluator Quick Fill:</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => fillTestAccount('user_a@netshare.lab')}
            className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-blue-500/50 hover:text-blue-400 text-left transition-colors"
          >
            User A (Primary)
          </button>
          <button
            type="button"
            onClick={() => fillTestAccount('user_b@netshare.lab')}
            className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 text-left transition-colors"
          >
            User B (Isolation Test)
          </button>
        </div>
      </div>

      <div className="mt-5 text-center text-xs text-slate-400">
        Don&apos;t have an account yet?{' '}
        <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4">
          Create an account
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading NetShare...
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
