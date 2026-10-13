'use client'

import React, { useState } from 'react'
import {
  FileText,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Download,
  HardDrive,
  FileCode,
  Calendar,
  Layers,
  Share2
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { FileRow } from '@/types/netshare'
import { formatBytes, formatDate, formatThroughput } from '@/lib/utils'
import { downloadAndVerifyFile, DownloadResult } from './download-verifier'

interface FileDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileRow | null
  onOpenShareModal: (file: FileRow) => void
}

export function FileDetailsSheet({
  open,
  onOpenChange,
  file,
  onOpenShareModal,
}: FileDetailsSheetProps) {
  const [copiedHash, setCopiedHash] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null)
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  if (!file) return null

  const copyHashToClipboard = () => {
    if (file.checksum_sha256) {
      navigator.clipboard.writeText(file.checksum_sha256)
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2000)
    }
  }

  const handleDownloadAndVerify = async () => {
    setIsDownloading(true)
    setDownloadError(null)
    setDownloadResult(null)

    try {
      const result = await downloadAndVerifyFile(file, (status) => {
        setDownloadProgress(status)
      })
      setDownloadResult(result)
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
      setDownloadProgress(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#111111] border-l border-white/10 text-white sm:max-w-md overflow-y-auto p-6">
        <SheetHeader className="border-b border-white/10 pb-5">
          <SheetTitle className="text-white flex items-center gap-3 text-base font-bold">
            <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <span className="truncate">{file.name}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6 text-xs">
          {/* Integrity / Verification Status Banner */}
          {downloadResult && (
            <div
              className={`p-4 rounded-xl border animate-in fade-in ${
                downloadResult.integrity.status === 'matched'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
                {downloadResult.integrity.status === 'matched' ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <span>SHA-256 Digest Verified</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5 text-rose-400" />
                    <span>Integrity Mismatch Detected</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {downloadResult.integrity.status === 'matched'
                  ? 'The received bytes match the stored SHA-256 digest byte-for-byte.'
                  : 'The downloaded bytes do not match expected checksum! Alteration detected.'}
              </p>
              <div className="mt-3 pt-2.5 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-white/50">Duration:</span>{' '}
                  <span className="font-bold text-white">
                    {Math.round(downloadResult.durationMs)} ms
                  </span>
                </div>
                <div>
                  <span className="text-white/50">Throughput:</span>{' '}
                  <span className="font-bold text-white">
                    {formatThroughput(downloadResult.bytesTransferred, downloadResult.durationMs)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {downloadError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <div className="font-bold mb-1">Download Error</div>
              <p className="text-[11px]">{downloadError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={handleDownloadAndVerify}
              disabled={isDownloading}
              className="linear-button-primary flex-1 h-11 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
                  {downloadProgress || 'Downloading...'}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download & Verify
                </>
              )}
            </button>

            <button
              onClick={() => onOpenShareModal(file)}
              className="linear-button-secondary h-11 px-4 rounded-xl text-xs uppercase tracking-wider"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              Share
            </button>
          </div>

          {/* SHA-256 Checksum Card */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-white/50">
              <span className="font-bold flex items-center gap-1.5 text-white text-[11px] uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                SHA-256 Digest
              </span>
              <button
                onClick={copyHashToClipboard}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/30 text-white text-[10px] font-bold uppercase transition-all"
              >
                {copiedHash ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-white/70 break-all bg-white/[0.02] p-3 rounded-lg border border-white/[0.06] leading-relaxed">
              {file.checksum_sha256 || 'None computed'}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="space-y-3 divide-y divide-white/[0.06]">
            <div className="flex justify-between items-center pt-2">
              <span className="text-white/50 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-white/70" /> Size
              </span>
              <span className="font-mono text-white">
                {formatBytes(file.size_bytes)} ({file.size_bytes.toLocaleString()} bytes)
              </span>
            </div>

            <div className="flex justify-between items-center pt-3">
              <span className="text-white/50 flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-white/70" /> MIME Type
              </span>
              <span className="font-mono text-white/80">
                {file.mime_type || 'application/octet-stream'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3">
              <span className="text-white/50 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-white/70" /> Storage Path
              </span>
              <span className="font-mono text-white/80 truncate max-w-[200px]" title={file.storage_path}>
                {file.storage_path}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3">
              <span className="text-white/50 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/70" /> Created
              </span>
              <span className="text-white font-mono">{formatDate(file.created_at)}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
