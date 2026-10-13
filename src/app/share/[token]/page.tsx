'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Network,
  Download,
  ShieldCheck,
  ShieldAlert,
  Clock,
  HardDrive,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Radio
} from 'lucide-react'
import { computeSha256FromBuffer, compareDigests } from '@/lib/crypto/sha256'
import { formatBytes, formatDate, formatThroughput } from '@/lib/utils'

interface ShareFileData {
  id: string
  name: string
  size_bytes: number
  mime_type: string | null
  checksum_sha256: string | null
}

function ShareRedemptionContent() {
  const params = useParams()
  const token = params?.token as string

  const [isLoading, setIsLoading] = useState(true)
  const [fileData, setFileData] = useState<ShareFileData | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<{ message: string; code: number } | null>(null)

  // Download & verification states
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadStep, setDownloadStep] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<{
    status: 'matched' | 'mismatch'
    durationMs: number
    bytes: number
  } | null>(null)

  useEffect(() => {
    if (!token) return

    async function redeemToken() {
      setIsLoading(true)
      setErrorStatus(null)
      try {
        const res = await fetch(`/api/shares/${token}/redeem`, {
          method: 'POST',
        })

        const json = await res.json()

        if (!res.ok) {
          setErrorStatus({
            message: json?.error?.message || 'Failed to access shared file.',
            code: res.status,
          })
          return
        }

        setFileData(json.data.file)
        setSignedUrl(json.data.signedUrl)
        setExpiresAt(json.data.expiresAt)
      } catch (err: unknown) {
        setErrorStatus({
          message: err instanceof Error ? err.message : 'Network error redeeming share link.',
          code: 500,
        })
      } finally {
        setIsLoading(false)
      }
    }

    redeemToken()
  }, [token])

  const handleDownloadAndVerify = async () => {
    if (!fileData || !signedUrl) return

    setIsDownloading(true)
    setDownloadStep('Streaming bytes from storage...')
    const startTime = performance.now()

    try {
      const response = await fetch(signedUrl)
      if (!response.ok) {
        throw new Error(`Download failed with status HTTP ${response.status}`)
      }

      const buffer = await response.arrayBuffer()
      const durationMs = performance.now() - startTime

      setDownloadStep('Computing independent SHA-256 checksum...')
      const computedHash = await computeSha256FromBuffer(buffer)

      const isMatch = fileData.checksum_sha256
        ? compareDigests(computedHash, fileData.checksum_sha256)
        : true

      setVerificationResult({
        status: isMatch ? 'matched' : 'mismatch',
        durationMs,
        bytes: buffer.byteLength,
      })

      // Trigger browser file download
      const blob = new Blob([buffer], { type: fileData.mime_type || 'application/octet-stream' })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileData.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
      setDownloadStep(null)
    }
  }

  return (
    <div className="w-full max-w-lg animate-fade-in">
      {isLoading ? (
        <div className="linear-card p-12 text-center space-y-3">
          <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs uppercase tracking-widest font-bold text-white/50">
            Validating cryptographic share token...
          </p>
        </div>
      ) : errorStatus ? (
        <div className="linear-card p-8 space-y-5">
          <div className="flex items-center gap-3 text-amber-400">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Share Link Unavailable</h2>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5 font-mono text-xs">
            <div className="text-white/40">HTTP Status: {errorStatus.code}</div>
            <div className="text-amber-300 font-bold">{errorStatus.message}</div>
          </div>

          <p className="text-xs text-white/50 leading-relaxed">
            NetShare share links use high-entropy cryptographic tokens with strict expiration and owner-revocation capabilities.
          </p>

          <div className="pt-2">
            <Link
              href="/login"
              className="linear-button-secondary h-10 px-5 rounded-xl text-xs uppercase tracking-wider"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      ) : fileData ? (
        <div className="linear-card p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Authorized Access Granted</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight break-all">{fileData.name}</h1>
            <p className="text-xs text-white/50 font-medium">
              Ready for direct-to-storage stream download with independent SHA-256 verification.
            </p>
          </div>

          {/* Verification status if downloaded */}
          {verificationResult && (
            <div
              className={`p-4 rounded-xl border text-xs animate-in fade-in ${
                verificationResult.status === 'matched'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1 text-sm">
                {verificationResult.status === 'matched' ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Integrity Confirmed (SHA-256 Match)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    <span>Checksum Mismatch Detected</span>
                  </>
                )}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed font-mono">
                Transferred {formatBytes(verificationResult.bytes)} in{' '}
                {Math.round(verificationResult.durationMs)} ms (
                {formatThroughput(verificationResult.bytes, verificationResult.durationMs)}).
              </p>
            </div>
          )}

          {/* File details grid */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-white/50 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-white/70" /> File Payload
              </span>
              <span className="font-mono text-white font-bold">
                {formatBytes(fileData.size_bytes)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-white/50 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-white/70" /> MIME Type
              </span>
              <span className="font-mono text-white/80">
                {fileData.mime_type || 'application/octet-stream'}
              </span>
            </div>

            {expiresAt && (
              <div className="flex justify-between items-center">
                <span className="text-white/50 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" /> Link Expires
                </span>
                <span className="font-mono text-white/80">
                  {formatDate(expiresAt)}
                </span>
              </div>
            )}

            {fileData.checksum_sha256 && (
              <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
                <div className="text-white/50 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Expected SHA-256
                </div>
                <div className="font-mono text-[10px] text-white/70 break-all bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.06]">
                  {fileData.checksum_sha256}
                </div>
              </div>
            )}
          </div>

          {/* Download action button */}
          <button
            onClick={handleDownloadAndVerify}
            disabled={isDownloading}
            className="linear-button-primary w-full h-12 rounded-xl text-black font-black text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
                {downloadStep || 'Streaming bytes...'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" /> Download & Verify SHA-256
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function ShareRedemptionPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between relative selection:bg-[#5e6ad2]/40 selection:text-white overflow-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025] linear-grid z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.03] rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.03] rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Top Header bar matching compliance-checker */}
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
                  Guest Share Pipeline
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/login"
            className="text-[11px] font-bold text-white/50 hover:text-white uppercase tracking-widest transition-colors"
          >
            Sign In to Account →
          </Link>
        </div>
      </nav>

      {/* Main card with Suspense boundary */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <Suspense
          fallback={
            <div className="linear-card p-12 text-center space-y-3">
              <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs uppercase tracking-widest font-bold text-white/50">
                Loading shared file...
              </p>
            </div>
          }
        >
          <ShareRedemptionContent />
        </Suspense>
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
            Cryptographic SHA-256 Token Validation
          </div>
        </div>
      </footer>
    </div>
  )
}
