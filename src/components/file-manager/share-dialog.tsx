'use client'

import React, { useState, useEffect } from 'react'
import {
  Share2, Copy, Check, Clock, AlertCircle, Globe, Lock,
  Link2, ShieldCheck, ExternalLink, Eye, EyeOff
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FileRow } from '@/types/netshare'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileRow | null
  onFileUpdated?: (updatedFile: FileRow) => void
}

type ShareMode = 'link' | 'public'

export function ShareDialog({ open, onOpenChange, file, onFileUpdated }: ShareDialogProps) {
  const [mode, setMode] = useState<ShareMode>('link')
  const [expiryMinutes, setExpiryMinutes] = useState('600')   // 10 min default
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Public toggle state — reflects server truth, optimistic locally
  const [isPublic, setIsPublic] = useState(false)
  const [togglingPublic, setTogglingPublic] = useState(false)
  const [publicSuccess, setPublicSuccess] = useState(false)

  // Sync is_public from file prop on open
  useEffect(() => {
    if (open && file) {
      setIsPublic(file.is_public ?? false)
      setShareUrl('')
      setError('')
      setPublicSuccess(false)
      setMode('link')
    }
  }, [open, file])

  if (!file) return null

  // ── Expiry display helpers ─────────────────────────────────────────────────
  const expiryOptions = [
    { label: '10 Min', value: '10' },
    { label: '1 Hour', value: '60' },
    { label: '24 Hours', value: '1440' },
    { label: '7 Days', value: '10080' },
  ]

  const selectedOption = expiryOptions.find((o) => o.value === expiryMinutes) ?? expiryOptions[0]

  // ── Generate expiring share link ───────────────────────────────────────────
  const handleCreateShare = async () => {
    setIsPending(true)
    setError('')
    setShareUrl('')

    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          expiryHours: Number(expiryMinutes) / 60,  // API expects hours
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error?.message || 'Failed to generate share link')
      }

      const { data } = await res.json()
      setShareUrl(`${window.location.origin}/share/${data.token}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating share')
    } finally {
      setIsPending(false)
    }
  }

  // ── Toggle is_public via PATCH /api/files/:id ──────────────────────────────
  const handleTogglePublic = async (nextValue: boolean) => {
    setTogglingPublic(true)
    setError('')
    setPublicSuccess(false)

    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: nextValue }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error?.message || 'Failed to update visibility')
      }

      const { data: updatedFile } = await res.json()
      setIsPublic(updatedFile.is_public)
      setPublicSuccess(true)
      onFileUpdated?.(updatedFile)
      setTimeout(() => setPublicSuccess(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change visibility')
      setIsPublic(!nextValue)   // revert optimistic
    } finally {
      setTogglingPublic(false)
    }
  }

  const copyUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const expiryDisplay = Number(expiryMinutes) < 60
    ? `${expiryMinutes}m`
    : Number(expiryMinutes) < 1440
    ? `${Number(expiryMinutes) / 60}h`
    : `${Number(expiryMinutes) / 1440}d`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#111111] border border-white/10 text-white rounded-2xl shadow-2xl p-0 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white shrink-0">
              <Share2 className="h-4 w-4" />
            </div>
            Share File
          </DialogTitle>
          <p className="text-[11px] text-white/40 mt-1.5 font-mono truncate">
            {file.name}
          </p>
        </DialogHeader>

        {/* ── Mode Switcher ───────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <button
              onClick={() => { setMode('link'); setError(''); setShareUrl('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                mode === 'link'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              Expiring Link
            </button>
            <button
              onClick={() => { setMode('public'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                mode === 'public'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Public Access
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-2 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ═══ EXPIRING LINK MODE ══════════════════════════════════════════ */}
          {mode === 'link' && (
            <div className="space-y-4">
              {/* Security note */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] text-[11px] text-white/50 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  A cryptographically random token is generated. Only its <strong className="text-white/70">SHA-256 hash</strong> is stored in PostgreSQL — the raw token is never persisted. Anyone with this link can download the file without logging in.
                </span>
              </div>

              {/* Expiry picker */}
              {!shareUrl && (
                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-white/70" /> Link Expiration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {expiryOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setExpiryMinutes(opt.value)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                          expiryMinutes === opt.value
                            ? 'border-white bg-white text-black shadow-sm'
                            : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated URL */}
              {shareUrl && (
                <div className="space-y-2.5 p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Link Ready · valid {expiryDisplay}
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white/90 select-all focus:outline-none"
                    />
                    <button
                      onClick={copyUrl}
                      className="linear-button-primary h-10 px-4 rounded-xl shrink-0 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> Open in new tab
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ═══ PUBLIC ACCESS MODE ══════════════════════════════════════════ */}
          {mode === 'public' && (
            <div className="space-y-4">
              {/* Explanation card */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] text-[11px] text-white/50 leading-relaxed flex items-start gap-2">
                <Globe className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  When <strong className="text-white/70">public</strong>, any signed-in user can browse and download this file directly from the Files page. No share token needed. The file stays in your namespace — only its download access is widened.
                </span>
              </div>

              {/* Current status */}
              <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                isPublic
                  ? 'bg-cyan-500/[0.05] border-cyan-500/30'
                  : 'bg-white/[0.02] border-white/[0.07]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isPublic
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-white/[0.04] border-white/10 text-white/40'
                  }`}>
                    {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {isPublic ? 'Public — visible to all logged-in users' : 'Private — only you can access'}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5 font-mono">
                      {isPublic ? 'is_public = true' : 'is_public = false'}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => handleTogglePublic(!isPublic)}
                  disabled={togglingPublic}
                  className={`relative w-12 h-6 rounded-full transition-all shrink-0 disabled:opacity-50 ${
                    isPublic ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${
                    isPublic ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Success flash */}
              {publicSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>
                    {isPublic
                      ? 'File is now public. Any logged-in user can download it.'
                      : 'File is now private. Access restricted to you only.'}
                  </span>
                </div>
              )}

              {/* Access visibility info */}
              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div className={`p-3 rounded-xl border ${isPublic ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                  <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                    <Eye className="h-3.5 w-3.5" /> Who can see it
                  </div>
                  <p className="text-white/50">
                    {isPublic ? 'All authenticated users (any login)' : 'Only you (owner_id RLS)'}
                  </p>
                </div>
                <div className={`p-3 rounded-xl border ${isPublic ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                  <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> RLS Policy
                  </div>
                  <p className="text-white/50">
                    {isPublic
                      ? '"files: authenticated can read public"'
                      : '"files: owner can read"'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <DialogFooter className="px-6 pb-5 pt-3 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="linear-button-secondary h-10 rounded-xl text-xs uppercase tracking-wider"
          >
            Close
          </button>

          {mode === 'link' && !shareUrl && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleCreateShare}
              className="linear-button-primary h-10 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <div className="h-3.5 w-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              {isPending ? 'Generating...' : `Generate ${selectedOption.label} Link`}
            </button>
          )}

          {mode === 'link' && shareUrl && (
            <button
              type="button"
              onClick={() => { setShareUrl(''); setError('') }}
              className="linear-button-secondary h-10 rounded-xl text-xs uppercase tracking-wider"
            >
              New Link
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
