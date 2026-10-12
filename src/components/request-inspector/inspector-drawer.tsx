'use client'

import React from 'react'
import {
  Activity,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  ArrowRight,
  Info,
  Terminal
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { TransferLogRow } from '@/types/netshare'
import { formatBytes, formatDuration, formatThroughput } from '@/lib/utils'

interface RequestInspectorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: TransferLogRow | null
}

function getStatusBadge(code: number | null) {
  if (!code) return <Badge variant="outline" className="border-slate-700 text-slate-400">Pending</Badge>
  if (code >= 200 && code < 300) {
    return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">{code} OK</Badge>
  }
  if (code >= 400 && code < 500) {
    return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">{code} Client Error</Badge>
  }
  return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 font-mono">{code} Server Error</Badge>
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
  const isSuccess = (!log.status_code || log.status_code < 400) && !log.error_code

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-lg overflow-y-auto">
        <SheetHeader className="border-b border-slate-800 pb-4">
          <SheetTitle className="text-white flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              <span>HTTP Request Inspector</span>
            </div>
            {getStatusBadge(log.status_code)}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6 text-xs">
          {/* Operation & Method Overview */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                Operation Type
              </span>
              <span className="font-mono text-blue-400 font-bold uppercase">{log.operation}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                {endpointInfo.method}
              </span>
              <span className="text-slate-300 truncate">{endpointInfo.path}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Request ID:</span>
              <span className="font-mono text-slate-300">{log.request_id}</span>
            </div>
          </div>

          {/* Performance & Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span>Elapsed Duration</span>
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {formatDuration(log.duration_ms)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Source: performance.now()
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                <span>Observed Transfer</span>
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {formatBytes(log.bytes_transferred)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {formatThroughput(log.bytes_transferred, log.duration_ms || 0)}
              </div>
            </div>
          </div>

          {/* Observable HTTP Headers */}
          <div className="space-y-2">
            <h4 className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">
              Observable HTTP Protocol Headers
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Content-Type:</span>
                <span className="text-slate-300">application/json, octet-stream</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Content-Length:</span>
                <span className="text-slate-300">{log.bytes_transferred} bytes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sec-Fetch-Mode:</span>
                <span className="text-slate-300">cors</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Security-Layer:</span>
                <span className="text-emerald-400">TLS 1.3 (HTTPS Encrypted)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monotonic Timing:</span>
                <span className="text-blue-400">DOMHighResTimeStamp</span>
              </div>
            </div>
          </div>

          {/* Educational Callout: Browser vs Transport Layer Observability */}
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-blue-300">
              <Info className="h-4 w-4 shrink-0" />
              <span>Networking Observability Principle</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Browser JavaScript operates strictly at <strong>Layer 7 (Application)</strong>. It can observe HTTP headers, status codes, payload sizes, and high-resolution start/end timings.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Transport layer mechanics (raw TCP 3-way handshake SYN/ACK, retransmission, window size scaling) are managed transparently by the OS kernel and TLS stack. To inspect raw packets, use NetShare&apos;s <strong>Python TCP Socket Lab</strong> and <strong>Wireshark</strong>.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
