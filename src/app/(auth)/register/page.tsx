'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })

        if (error) {
          setErrorMessage(error.message)
          return
        }

        // If user is auto-confirmed or session is immediately returned
        if (data.session) {
          router.push('/files')
          router.refresh()
          return
        }

        // If confirmation is needed
        setSuccessMessage(
          'Registration initiated! If email confirmation is enabled, please check your inbox. Otherwise, proceed to sign in.'
        )
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected registration error occurred.')
      }
    })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Eyebrow & Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-white uppercase tracking-[0.3em] shadow-xl">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <span>New Namespace Provisioning</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tightest leading-tight text-white">
          Create NetShare <span className="text-white/40 italic">Account.</span>
        </h1>
        <p className="text-sm font-medium text-white/50 max-w-sm mx-auto leading-relaxed">
          Initialize a dedicated PostgreSQL RLS namespace with private object storage.
        </p>
      </div>

      {/* Register Card */}
      <div className="linear-card p-6 sm:p-8 space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-xs font-medium text-red-400 animate-in fade-in">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage ? (
          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3.5 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-emerald-400" />
            <div className="space-y-2">
              <p className="font-bold text-white text-sm">Account Created Successfully</p>
              <p className="text-white/60 leading-relaxed">{successMessage}</p>
              <Link
                href="/login"
                className="linear-button-primary h-9 px-4 rounded-lg text-black text-xs font-bold uppercase tracking-wider inline-flex mt-2"
              >
                Proceed to Sign In →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
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
                  placeholder="engineer@domain.com"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 text-sm font-medium transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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
                  <UserPlus className="h-4 w-4 mr-1.5" /> Initialize Account
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Switch to Login */}
      <div className="text-center text-xs text-white/40">
        Already have a configured namespace?{' '}
        <Link href="/login" className="text-white hover:underline underline-offset-4 font-bold ml-1">
          Sign In →
        </Link>
      </div>
    </div>
  )
}
