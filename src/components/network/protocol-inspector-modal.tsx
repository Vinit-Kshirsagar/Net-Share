'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Layers,
  ShieldCheck,
  Cpu,
  Clock,
  HardDrive,
  Network,
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Globe,
  Radio,
  Share2,
  KeyRound,
  FileText,
  HelpCircle,
  ExternalLink
} from 'lucide-react'
import { formatBytes, formatDuration } from '@/lib/utils'

export type NetworkOperationType = 'upload' | 'download' | 'listing' | 'auth' | 'share'

export interface ProtocolInspectionContext {
  fileName?: string
  fileSize?: number
  mimeType?: string
  checksumSha256?: string
  durationMs?: number
  statusCode?: number
  requestId?: string
  userEmail?: string
  tokenHash?: string
}

interface ProtocolInspectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialOperation?: NetworkOperationType
  contextData?: ProtocolInspectionContext | null
}

export function ProtocolInspectorModal({
  open,
  onOpenChange,
  initialOperation = 'upload',
  contextData,
}: ProtocolInspectorModalProps) {
  const [activeOp, setActiveOp] = useState<NetworkOperationType>(initialOperation)
  const [selectedLayer, setSelectedLayer] = useState<'l7' | 'l6' | 'l5' | 'l4' | 'l3' | 'l2' | 'l1'>('l7')

  useEffect(() => {
    if (initialOperation) {
      setActiveOp(initialOperation)
    }
  }, [initialOperation, open])

  // Context fallback values
  const fileName = contextData?.fileName || 'presentation-deck.pdf'
  const fileSize = contextData?.fileSize ?? 4194304 // 4 MB fallback
  const mimeType = contextData?.mimeType || 'application/pdf'
  const sha256 = contextData?.checksumSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  const durationMs = contextData?.durationMs ?? 342.8
  const statusCode = contextData?.statusCode ?? 200

  // Calculate simulated packet counts based on 1460-byte MSS
  const mssBytes = 1460
  const estimatedSegments = Math.max(1, Math.ceil(fileSize / mssBytes))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0c0c0c] border border-white/[0.12] text-white w-[95vw] sm:max-w-5xl xl:max-w-6xl max-h-[90vh] h-[88vh] flex flex-col p-0 rounded-2xl shadow-2xl overflow-hidden focus:outline-none">
        {/* ─── Top Header Ribbon ──────────────────────────────────────────────── */}
        <div className="p-6 border-b border-white/[0.08] bg-[#111111] shrink-0 z-20 pr-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white shrink-0">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em]">
                    Real-Time Network Telemetry
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  Full-Stack OSI & Protocol Inspector
                </h2>
              </div>
            </div>

            {/* Quick stats chip */}
            <div className="flex items-center gap-2 font-mono text-[11px] bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-white/40">Status:</span>
              <span className="text-emerald-400 font-bold">{statusCode} OK</span>
              <span className="text-white/20">|</span>
              <span className="text-white/40">Latency:</span>
              <span className="text-white font-bold">{formatDuration(durationMs)}</span>
            </div>
          </div>

          {/* Operation Selector Tabs */}
          <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'upload', label: 'File Upload Pipeline', icon: Zap },
              { id: 'download', label: 'Download & Verification', icon: HardDrive },
              { id: 'listing', label: 'Directory Discovery', icon: FileText },
              { id: 'auth', label: 'Authentication & Session', icon: KeyRound },
              { id: 'share', label: 'Expiring Share Link', icon: Share2 },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeOp === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveOp(tab.id as NetworkOperationType)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'text-white/50 hover:text-white bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── Main Modal Body ─────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-8 space-y-8 flex-1 overflow-y-auto">
          {/* Operation Summary Header */}
          <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                  Active Telemetry Target
                </span>
                <p className="font-mono text-sm font-bold text-white">
                  {activeOp === 'upload' && `POST /api/files (Metadata) + Storage Direct PUT (${fileName})`}
                  {activeOp === 'download' && `GET /api/files/:id/download + Storage Streaming GET (${fileName})`}
                  {activeOp === 'listing' && `GET /api/files?folderId=root&sortBy=created_at (PostgreSQL Query)`}
                  {activeOp === 'auth' && `POST /auth/v1/token?grant_type=password (Supabase Auth Edge)`}
                  {activeOp === 'share' && `POST /api/shares (Expiring Capability Grant + SHA-256 Token)`}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-white/60">
                <div>
                  <span className="text-white/30 text-[10px] block">PAYLOAD</span>
                  <span className="text-white font-bold">
                    {activeOp === 'upload' || activeOp === 'download' ? formatBytes(fileSize) : '1.24 KB'}
                  </span>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] block">EST. SEGMENTS</span>
                  <span className="text-white font-bold">
                    {activeOp === 'upload' || activeOp === 'download' ? `~${estimatedSegments} TCP frames` : '1-2 frames'}
                  </span>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] block">PROTOCOL</span>
                  <span className="text-cyan-400 font-bold">HTTP/2 (h2)</span>
                </div>
              </div>
            </div>

            {/* SHA-256 Integrity Bar */}
            {(activeOp === 'upload' || activeOp === 'download') && (
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between gap-3 text-[11px] font-mono">
                <div className="flex items-center gap-2 text-white/50 shrink-0">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>SHA-256 Digest:</span>
                </div>
                <span className="text-emerald-400 truncate select-all">{sha256}</span>
              </div>
            )}
          </div>

          {/* ─── 7-Layer OSI Model Interactive Dissection ─────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.25em] flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-white/60" />
                <span>OSI 7-Layer Protocol Dissection</span>
              </h3>
              <span className="text-[11px] text-white/40 font-mono">
                Select a layer to inspect header framing
              </span>
            </div>

            {/* Layer Tabs */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              {[
                { id: 'l7', num: 'L7', name: 'Application' },
                { id: 'l6', num: 'L6', name: 'Presentation' },
                { id: 'l5', num: 'L5', name: 'Session' },
                { id: 'l4', num: 'L4', name: 'Transport' },
                { id: 'l3', num: 'L3', name: 'Network' },
                { id: 'l2', num: 'L2', name: 'Data Link' },
                { id: 'l1', num: 'L1', name: 'Physical' },
              ].map((layer) => {
                const isSelected = selectedLayer === layer.id
                return (
                  <button
                    key={layer.id}
                    onClick={() => setSelectedLayer(layer.id as any)}
                    className={`p-2.5 rounded-lg text-center transition-all ${
                      isSelected
                        ? 'bg-white text-black font-bold shadow-md'
                        : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold">{layer.num}</div>
                    <div className="text-[11px] truncate font-medium">{layer.name}</div>
                  </button>
                )
              })}
            </div>

            {/* Selected Layer Deep-Dive Content */}
            <div className="p-6 rounded-2xl bg-[#111111] border border-white/10 space-y-6">
              {selectedLayer === 'l7' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-black text-[10px]">
                        LAYER 7
                      </span>
                      <h4 className="font-bold text-sm text-white">Application Layer (HTTP/2, REST, Supabase)</h4>
                    </div>
                    <span className="font-mono text-[11px] text-white/40">RFC 7540 / RFC 9110</span>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed">
                    Operates at the interface where browser JavaScript interacts with network protocols. During {activeOp}, the application constructs HTTP request frames with serialized headers, multiplexed over a single persistent TCP socket.
                  </p>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      Generated HTTP Headers & Framing
                    </span>
                    <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-[11px] space-y-1.5 text-white/80">
                      <div><span className="text-white/40">:method</span>: {activeOp === 'upload' ? 'POST' : activeOp === 'download' ? 'GET' : 'POST'}</div>
                      <div><span className="text-white/40">:scheme</span>: https</div>
                      <div><span className="text-white/40">:authority</span>: chotuwwjokczbwcscfmo.supabase.co</div>
                      <div><span className="text-white/40">:path</span>: {activeOp === 'upload' ? `/storage/v1/object/netshare-files/...` : `/api/files`}</div>
                      <div><span className="text-white/40">Authorization</span>: Bearer eyJhbGciOiJIUzI1NiIsIn...</div>
                      <div><span className="text-white/40">Content-Type</span>: {activeOp === 'upload' ? mimeType : 'application/json'}</div>
                      <div><span className="text-white/40">Content-Length</span>: {fileSize} bytes</div>
                      <div><span className="text-white/40">Sec-Fetch-Mode</span>: cors</div>
                      <div><span className="text-white/40">Accept-Encoding</span>: gzip, deflate, br, zstd</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedLayer === 'l6' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-black text-[10px]">
                        LAYER 6
                      </span>
                      <h4 className="font-bold text-sm text-white">Presentation Layer (TLS 1.3 & Cryptographic Hashing)</h4>
                    </div>
                    <span className="font-mono text-[11px] text-white/40">RFC 8446 (TLS 1.3) / FIPS 180-4 (SHA-256)</span>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed">
                    Responsible for data formatting, character encoding (UTF-8), MIME parsing, and end-to-end cryptographic encapsulation. In NetShare, data is encrypted via TLS 1.3 before entering the transport layer, and checksummed via SHA-256.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Lock className="h-4 w-4 text-emerald-400" />
                        <span>TLS 1.3 Cipher Suite</span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Negotiated: <span className="font-mono text-emerald-400">TLS_AES_256_GCM_SHA384</span>
                      </p>
                      <p className="text-[10px] text-white/40 leading-relaxed">
                        Uses ephemeral ECDHE (Elliptic Curve Diffie-Hellman Ephemeral) key exchange with curve X25519, ensuring Perfect Forward Secrecy (PFS).
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <ShieldCheck className="h-4 w-4 text-cyan-400" />
                        <span>Client-Side SHA-256</span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Engine: <span className="font-mono text-cyan-400">Web Crypto API (SubtleCrypto)</span>
                      </p>
                      <p className="text-[10px] text-white/40 leading-relaxed">
                        Computes an immutable 256-bit digest in browser hardware threads before chunk streaming begins, providing tamper-evident verification.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedLayer === 'l5' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-black text-[10px]">
                        LAYER 5
                      </span>
                      <h4 className="font-bold text-sm text-white">Session Layer (Auth Handshakes & Connection State)</h4>
                    </div>
                    <span className="font-mono text-[11px] text-white/40">JWT RFC 7519 / TLS Session Tickets</span>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed">
                    Manages session initiation, synchronization, and security context tokens between the client and backend.
                  </p>

                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-2">
                      <div className="flex items-center justify-between text-white">
                        <span className="text-white/40">Session Mechanism:</span>
                        <span className="text-amber-400 font-bold">Supabase Auth (PostgreSQL auth.users)</span>
                      </div>
                      <div className="flex items-center justify-between text-white">
                        <span className="text-white/40">Token Type:</span>
                        <span className="text-white">RS256 JWT (JSON Web Token)</span>
                      </div>
                      <div className="flex items-center justify-between text-white">
                        <span className="text-white/40">Session Resumption:</span>
                        <span className="text-emerald-400">TLS 0-RTT / 1-RTT Pre-Shared Key (PSK)</span>
                      </div>
                      <div className="flex items-center justify-between text-white">
                        <span className="text-white/40">Keep-Alive:</span>
                        <span className="text-white">timeout=120, max=1000 persistent connection</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedLayer === 'l4' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-black text-[10px]">
                        LAYER 4
                      </span>
                      <h4 className="font-bold text-sm text-white">Transport Layer (TCP Handshake, Flow Control & Sockets)</h4>
                    </div>
                    <span className="font-mono text-[11px] text-white/40">RFC 793 (TCP) / RFC 9293</span>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed">
                    Guarantees reliable, in-order byte stream delivery across unreliable network paths. TCP implements sliding window flow control, segment retransmission timers, and congestion avoidance.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08]">
                      <span className="text-[10px] text-white/40 block">3-WAY HANDSHAKE</span>
                      <div className="text-white font-bold mt-1">SYN → SYN-ACK → ACK</div>
                      <span className="text-[10px] text-emerald-400 mt-0.5 block">1 RTT Connection Setup</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08]">
                      <span className="text-[10px] text-white/40 block">MAX SEGMENT SIZE (MSS)</span>
                      <div className="text-white font-bold mt-1">1,460 bytes</div>
                      <span className="text-[10px] text-white/40 mt-0.5 block">MTU (1500) - IP(20) - TCP(20)</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08]">
                      <span className="text-[10px] text-white/40 block">CONGESTION ALGORITHM</span>
                      <div className="text-white font-bold mt-1">CUBIC / BBR</div>
                      <span className="text-[10px] text-white/40 mt-0.5 block">Pacing & Slow Start</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] font-mono text-[11px] text-white/70 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-white/40">Segment Dissection for this Transfer:</div>
                    <div>• Payload bytes: <span className="text-white">{fileSize}</span></div>
                    <div>• Number of TCP segments required: <span className="text-emerald-400 font-bold">{estimatedSegments} segments</span></div>
                    <div>• Sequence numbers: Continuously acknowledged via sliding window ACK packets.</div>
                  </div>
                </div>
              )}

              {selectedLayer === 'l3' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-black text-[10px]">
                        LAYER 3
                      </span>
                      <h4 className="font-bold text-sm text-white">Network Layer (IPv4 / IPv6 Packet Routing)</h4>
                    </div>
                    <span className="font-mono text-[11px] text-white/40">RFC 791 (IPv4) / RFC 8200 (IPv6)</span>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed">
                    Addresses and routes individual packets hop-by-hop across Autonomous Systems (AS) via BGP routing tables. Packets navigate local gateways, ISP routers, and edge CDN nodes.
                  </p>

                  <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-[11px] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/40">Source IP (Client):</span>
                      <span className="text-white">192.168.1.104 (NAT Private RFC 1918)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Destination IP (Supabase Edge):</span>
                      <span className="text-cyan-400 font-bold">104.18.25.109 (Cloudflare / AWS Anycast)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Default MTU:</span>
                      <span className="text-white">1,500 bytes (Ethernet Standard)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Time-To-Live (TTL):</span>
                      <span className="text-white">64 (Decremented by 1 at each router hop)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Fragmentation Flags:</span>
                      <span className="text-emerald-400 font-bold">DF (Don&apos;t Fragment) = 1</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLayer === 'l2' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-black text-[10px]">
                        LAYER 2
                      </span>
                      <h4 className="font-bold text-sm text-white">Data Link Layer (Ethernet 802.3 / Wi-Fi 802.11ax)</h4>
                    </div>
                    <span className="font-mono text-[11px] text-white/40">IEEE 802.3 / 802.11ax</span>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed">
                    Packages IP packets into physical local network frames. Uses 48-bit MAC addresses to deliver frames between local network interfaces (e.g. computer to Wi-Fi access point / router) and verifies integrity with a 32-bit CRC.
                  </p>

                  <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-[11px] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/40">Framing Format:</span>
                      <span className="text-white">Ethernet II Frame (Preamble + SFD + MACs + EtherType + Payload + FCS)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">EtherType:</span>
                      <span className="text-emerald-400">0x0800 (IPv4)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Frame Check Sequence (FCS):</span>
                      <span className="text-white">32-bit CRC (Hardware verified by NIC)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Address Resolution:</span>
                      <span className="text-white">ARP (IPv4) / Neighbor Discovery Protocol (IPv6)</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLayer === 'l1' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-black text-[10px]">
                        LAYER 1
                      </span>
                      <h4 className="font-bold text-sm text-white">Physical Layer (Bits, Radio Waves & Fiber Photons)</h4>
                    </div>
                    <span className="font-mono text-[11px] text-white/40">PHY / 1000BASE-T / 802.11 Wi-Fi RF</span>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed">
                    The lowest layer in the stack. Converts structured digital frames into raw physical electrical voltages, optical laser pulses, or modulated electromagnetic radio waves transmitted across the physical medium.
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-1">
                      <span className="text-[10px] text-white/40 font-mono">MEDIUM</span>
                      <div className="font-bold text-white">Wi-Fi (OFDMA 1024-QAM) / CAT6 Ethernet</div>
                      <p className="text-[10px] text-white/40 mt-1">Transmitted at 2.4GHz / 5GHz carrier frequencies or copper differential voltage pairs.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-1">
                      <span className="text-[10px] text-white/40 font-mono">INTERNET BACKBONE</span>
                      <div className="font-bold text-white">Dense Wavelength Optical Fiber</div>
                      <p className="text-[10px] text-white/40 mt-1">Laser pulses at ~200,000 km/s (~67% speed of light in vacuum) across subsea and terrestrial cables.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── End-to-End Packet Trace Diagram ──────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.25em] flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-white/60" />
              <span>End-to-End Packet Traversal Trace</span>
            </h3>

            <div className="p-5 rounded-2xl bg-[#111111] border border-white/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-emerald-400 font-bold text-[11px]">1. Client Browser (L7-L5)</div>
                  <p className="text-[10px] text-white/50">
                    Constructs HTTP/2 frames, generates SHA-256 hash, and injects JWT authorization header.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-cyan-400 font-bold text-[11px]">2. OS Network Stack (L4-L2)</div>
                  <p className="text-[10px] text-white/50">
                    Segments data into 1460B TCP packets, wraps in IP packets (MTU 1500), and transmits Ethernet frames.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-amber-400 font-bold text-[11px]">3. Internet Edge Gateway (L3-L7)</div>
                  <p className="text-[10px] text-white/50">
                    BGP routes packets to Cloudflare/AWS edge. TLS terminates and verifies SSL certificate.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-purple-400 font-bold text-[11px]">4. Supabase Engine & RLS</div>
                  <p className="text-[10px] text-white/50">
                    Validates user JWT against auth.uid(), enforces PostgreSQL Row-Level Security, and stores metadata.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Observability Callout ─────────────────────────────────────────── */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-start gap-3.5">
            <HelpCircle className="h-5 w-5 text-white/60 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-white">Why Can&apos;t Browser JavaScript Observe Raw TCP Packets?</span>
              <p className="text-white/50 leading-relaxed text-[11px]">
                Web browsers enforce a strict security sandbox: JavaScript is restricted to <strong>Layer 7 (Application)</strong> via the Fetch and Resource Timing APIs. Raw Ethernet frames, TCP sequence numbers, SYN/ACK packets, and kernel retransmissions are processed exclusively by the operating system kernel. To capture the actual raw packets on the wire, run <strong>Wireshark</strong> or NetShare&apos;s <strong>Python TCP Lab</strong> on port 9099!
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
