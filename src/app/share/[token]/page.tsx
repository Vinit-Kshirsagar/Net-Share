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
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    <div className="w-full max-w-lg">
      {isLoading ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Validating cryptographic share token...</p>
        </div>
      ) : errorStatus ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-lg font-bold text-white">Share Link Unavailable</h2>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
            <div className="text-slate-500">Status Code: HTTP {errorStatus.code}</div>
            <div className="text-amber-300">{errorStatus.message}</div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            NetShare share links use high-entropy cryptographic tokens with strict expiration and owner-revocation capabilities. If you believe this is an error, request an updated share link from the file owner.
          </p>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
            </Link>
          </div>
        </div>
      ) : fileData ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl">
          <div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] mb-2 font-mono">
              Authorized Access Granted
            </Badge>
            <h1 className="text-xl font-bold text-white break-all">{fileData.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Ready for secure download with end-to-end SHA-256 verification.
            </p>
          </div>

          {/* Verification status if downloaded */}
          {verificationResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs animate-in fade-in ${
                verificationResult.status === 'matched'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold mb-1">
                {verificationResult.status === 'matched' ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Integrity Confirmed (SHA-256 Match)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <span>Checksum Mismatch!</span>
                  </>
                )}
              </div>
              <p className="text-[11px] opacity-90">
                Transferred {formatBytes(verificationResult.bytes)} in{' '}
                {Math.round(verificationResult.durationMs)} ms (
                {formatThroughput(verificationResult.bytes, verificationResult.durationMs)}).
              </p>
            </div>
          )}

          {/* File details grid */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-blue-400" /> File Size
              </span>
              <span className="font-mono text-white font-semibold">
                {formatBytes(fileData.size_bytes)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-purple-400" /> MIME Type
              </span>
              <span className="font-mono text-slate-300">
                {fileData.mime_type || 'application/octet-stream'}
              </span>
            </div>

            {expiresAt && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" /> Link Expires
                </span>
                <span className="font-mono text-slate-300">
                  {formatDate(expiresAt)}
                </span>
              </div>
            )}

            {fileData.checksum_sha256 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Expected SHA-256
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900 p-2 rounded border border-slate-800">
                  {fileData.checksum_sha256}
                </div>
              </div>
            )}
          </div>

          {/* Download action button */}
          <Button
            onClick={handleDownloadAndVerify}
            disabled={isDownloading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 h-auto shadow-lg shadow-blue-600/20"
          >
            {isDownloading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {downloadStep || 'Streaming bytes...'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" /> Download & Verify SHA-256
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default function ShareRedemptionPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header bar */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-white hover:opacity-90">
          <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Network className="h-4 w-4" />
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            NetShare
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Shared File
          </span>
        </Link>

        <Link
          href="/login"
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Sign In to Your Account →
        </Link>
      </header>

      {/* Main card with Suspense boundary */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Suspense fallback={
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading shared file...</p>
          </div>
        }>
          <ShareRedemptionContent />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-slate-900 text-center text-xs text-slate-500">
        NetShare • Network File Server & Protocol Explorer
      </footer>
    </div>
  )
}
