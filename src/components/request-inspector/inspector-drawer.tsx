'use client'

import React from 'react'
import {
  Activity,
  Clock,
  HardDrive,
  Info,
  Shield,
  Layers
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { TransferLogRow } from '@/types/netshare'
import { formatBytes, formatDuration, formatThroughput } from '@/lib/utils'

interface RequestInspectorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: TransferLogRow | null
}

function getStatusBadge(code: number | null) {
  if (!code) return <span className="px-2 py-0.5 rounded-md border border-white/10 text-white/40 text-[10px] font-bold">Pending</span>
  if (code >= 200 && code < 300) {
    return (
      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] font-bold">
        {code} OK
      </span>
    )
  }
  if (code >= 400 && code < 500) {
    return (
      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[11px] font-bold">
        {code} Client Error
      </span>
    )
  }
  return (
    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-[11px] font-bold">
      {code} Server Error
    </span>
  )
}

function getEndpointForOperation(op: string) {
  switch (op) {
    case 'upload':
      return { method: 'POST', path: '/api/files (Metadata) + Storage Direct PUT' }
    case 'download':
      return { method: 'GET', path: '/api/files/:id/download + Storage Direct GET' }
    case 'delete':
      return { method: 'DELETE', path: '/api/files/:id' }
    case 'rename':
      return { method: 'PATCH', path: '/api/files/:id' }
    case 'share':
      return { method: 'POST', path: '/api/shares' }
    case 'tcp_test':
      return { method: 'TCP/STREAM', path: '127.0.0.1:9099 (NSHR framing)' }
    default:
      return { method: 'HTTP', path: '/api/telemetry' }
  }
}

export function RequestInspectorDrawer({
  open,
  onOpenChange,
  log,
}: RequestInspectorDrawerProps) {
  if (!log) return null

  const endpointInfo = getEndpointForOperation(log.operation)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#111111] border-l border-white/10 text-white sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="border-b border-white/10 pb-5">
          <SheetTitle className="text-white flex items-center justify-between text-base font-bold">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white">
                <Activity className="h-4 w-4" />
              </div>
              <span>HTTP Request Inspector</span>
            </div>
            {getStatusBadge(log.status_code)}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6 text-xs">
          {/* Operation & Method Overview */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em]">
                Operation Type
              </span>
              <span className="font-mono text-white font-bold uppercase">{log.operation}</span>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] font-mono text-[11px] flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px]">
                {endpointInfo.method}
              </span>
              <span className="text-white/80 truncate">{endpointInfo.path}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
              <span>Request Identifier:</span>
              <span className="font-mono text-white/80">{log.request_id}</span>
            </div>
          </div>

          {/* Performance & Metrics Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-white/50 text-[11px] uppercase font-bold tracking-wider">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Elapsed Duration</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {formatDuration(log.duration_ms)}
              </div>
              <div className="text-[10px] text-white/30 font-mono">
                Source: DOMHighResTimeStamp
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-white/50 text-[11px] uppercase font-bold tracking-wider">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                <span>Payload Size</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {formatBytes(log.bytes_transferred)}
              </div>
              <div className="text-[10px] text-white/30 font-mono">
                {formatThroughput(log.bytes_transferred, log.duration_ms || 0)}
              </div>
            </div>
          </div>

          {/* Observable HTTP Headers */}
          <div className="space-y-2.5">
            <h4 className="font-bold uppercase tracking-[0.2em] text-[10px] text-white/40 px-1">
              Observable HTTP Protocol Headers
            </h4>
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] space-y-2.5">
              <div className="flex justify-between">
                <span className="text-white/40">Content-Type:</span>
                <span className="text-white/80">application/json, octet-stream</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Content-Length:</span>
                <span className="text-white/80">{log.bytes_transferred} bytes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Sec-Fetch-Mode:</span>
                <span className="text-white/80">cors</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Security-Layer:</span>
                <span className="text-emerald-400 font-bold">TLS 1.3 (HTTPS Encrypted)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Monotonic Timing:</span>
                <span className="text-white font-bold">performance.now()</span>
              </div>
            </div>
          </div>

          {/* Educational Callout: Browser vs Transport Layer Observability */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-white text-xs uppercase tracking-wide">
              <Info className="h-4 w-4 shrink-0 text-white/60" />
              <span>Networking Observability Principle</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Browser JavaScript operates strictly at <strong>Layer 7 (Application)</strong>. It observes HTTP status codes, headers, response payloads, and high-resolution start/end timings.
            </p>
            <p className="text-[11px] text-white/40 leading-relaxed">
              Transport layer mechanics (raw TCP 3-way handshake SYN/ACK, retransmission, sliding window scaling) are managed transparently by the OS kernel. To inspect raw frames at Layer 4, use NetShare&apos;s <strong>Python TCP Socket Lab</strong> and <strong>Wireshark</strong>.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
