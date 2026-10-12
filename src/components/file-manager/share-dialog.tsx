'use client'

import React, { useState } from 'react'
import { Share2, Copy, Check, Clock, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileRow } from '@/types/netshare'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileRow | null
}

export function ShareDialog({ open, onOpenChange, file }: ShareDialogProps) {
  const [expiryHours, setExpiryHours] = useState('24')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  if (!file) return null

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
          expiryHours: parseInt(expiryHours, 10),
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error?.message || 'Failed to generate share link')
      }

      const { data } = await res.json()
      const url = `${window.location.origin}/share/${data.token}`
      setShareUrl(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating share')
    } finally {
      setIsPending(false)
    }
  }

  const copyUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-5 w-5 text-blue-400" />
            Create Secure Share Link
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="text-xs text-slate-300">
            Sharing file: <span className="font-semibold text-white">{file.name}</span>
          </div>

          {!shareUrl ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-400" /> Link Expiration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1 Hour', value: '1' },
                  { label: '24 Hours', value: '24' },
                  { label: '7 Days', value: '168' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpiryHours(opt.value)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      expiryHours === opt.value
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                A cryptographically secure random token is generated. Only the SHA-256 hash of the token is stored in the database.
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800 animate-in fade-in">
              <label className="text-[11px] font-semibold text-emerald-400">
                Share Link Generated ({expiryHours}h validity)
              </label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="bg-slate-900 border-slate-800 text-xs font-mono text-slate-300"
                />
                <Button
                  onClick={copyUrl}
                  className="bg-blue-600 hover:bg-blue-500 text-white shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            Close
          </Button>
          {!shareUrl && (
            <Button
              type="button"
              disabled={isPending}
              onClick={handleCreateShare}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isPending ? 'Generating...' : 'Generate Share Link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
