'use client'

import React, { useState } from 'react'
import {
  FileText,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Download,
  Clock,
  HardDrive,
  FileCode,
  Calendar,
  Layers,
  Activity
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
      <SheetContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b border-slate-800 pb-4">
          <SheetTitle className="text-white flex items-center gap-2.5 text-base">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
            <span className="truncate">{file.name}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6 text-xs">
          {/* Integrity / Verification Status Banner */}
          {downloadResult && (
            <div
              className={`p-3.5 rounded-xl border animate-in fade-in ${
                downloadResult.integrity.status === 'matched'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm mb-1.5">
                {downloadResult.integrity.status === 'matched' ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <span>SHA-256 Digest Verified</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5 text-red-400" />
                    <span>Integrity Mismatch!</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {downloadResult.integrity.status === 'matched'
                  ? 'The received bytes match the expected SHA-256 checksum exactly byte-for-byte.'
                  : 'The downloaded bytes do not match the expected checksum! The file may have been altered or corrupted in transit.'}
              </p>
              <div className="mt-2.5 pt-2 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400">Duration:</span>{' '}
                  <span className="font-semibold text-white">
                    {Math.round(downloadResult.durationMs)} ms
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Throughput:</span>{' '}
                  <span className="font-semibold text-white">
                    {formatThroughput(downloadResult.bytesTransferred, downloadResult.durationMs)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {downloadError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <div className="font-semibold mb-1">Download Error</div>
              <p className="text-[11px]">{downloadError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadAndVerify}
              disabled={isDownloading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              {isDownloading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  {downloadProgress || 'Downloading...'}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download & Verify SHA-256
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => onOpenShareModal(file)}
              className="border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              Share Link
            </Button>
          </div>

          {/* SHA-256 Checksum Card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                SHA-256 Checksum
              </span>
              <button
                onClick={copyHashToClipboard}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px]"
              >
                {copiedHash ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy Hash
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-400 break-all bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
              {file.checksum_sha256 || 'None computed'}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="space-y-3 divide-y divide-slate-800/80">
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-blue-400" /> Size
              </span>
              <span className="font-mono text-slate-200">
                {formatBytes(file.size_bytes)} ({file.size_bytes.toLocaleString()} bytes)
              </span>
            </div>

            <div className="flex justify-between items-center pt-3">
              <span className="text-slate-400 flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-amber-400" /> MIME Type
              </span>
              <span className="font-mono text-slate-200">
                {file.mime_type || 'application/octet-stream'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" /> Storage Path
              </span>
              <span className="font-mono text-slate-300 truncate max-w-[200px]" title={file.storage_path}>
                {file.storage_path}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Uploaded
              </span>
              <span className="text-slate-200">{formatDate(file.created_at)}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
