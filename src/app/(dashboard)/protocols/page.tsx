'use client'

import React, { useState } from 'react'
import {
  Layers,
  Globe,
  Shield,
  Server,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Terminal,
  Activity,
  Network,
  BookOpen,
  ChevronDown,
  HelpCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface VivaTopic {
  question: string
  answer: string
  category: string
}

const VIVA_TOPICS: VivaTopic[] = [
  {
    category: 'Transport Layer',
    question: 'Why does NetShare require message framing over TCP?',
    answer:
      'TCP provides a stream of continuous bytes without preserving application message boundaries (write(100) on client may be received as read(40) + read(60) on server). Without a framing protocol like NetShare\'s NSHR (with magic bytes and big-endian payload length), the receiver cannot determine where one file chunk or metadata packet ends and the next begins.',
  },
  {
    category: 'Transport Layer',
    question: 'What is the fundamental difference between TCP and UDP?',
    answer:
      'TCP is connection-oriented, provides guaranteed in-order delivery, retransmits lost segments, and implements sliding-window congestion control. UDP is connectionless and datagram-oriented, providing no delivery, ordering, or duplicate-detection guarantees, offering lower overhead at the expense of reliability.',
  },
  {
    category: 'Application Layer',
    question: 'How does HTTP/3 differ from HTTP/2 and HTTP/1.1 in transport?',
    answer:
      'HTTP/1.1 and HTTP/2 run on TCP + TLS. When a TCP segment is lost in HTTP/2, all multiplexed streams are blocked (Head-of-Line blocking). HTTP/3 replaces TCP with QUIC over UDP, providing independent stream delivery so packet loss on one stream does not stall other streams.',
  },
  {
    category: 'Security',
    question: 'What is the role of TLS 1.3 in HTTPS file transfers?',
    answer:
      'TLS 1.3 encrypts application payloads using authenticated symmetric encryption (AES-GCM or ChaCha20-Poly1305) after an ephemeral Diffie-Hellman handshake, preventing eavesdropping and tampering. It also validates the server\'s identity using X.509 digital certificates.',
  },
  {
    category: 'Network Layer',
    question: 'Why doesn\'t every HTTP request trigger a DNS query?',
    answer:
      'Both the operating system and the browser cache resolved IP addresses according to the DNS record\'s TTL (Time-To-Live). Furthermore, HTTP keep-alive and connection pooling reuse established TCP/TLS connections across multiple requests to the same origin.',
  },
  {
    category: 'Observability',
    question: 'Why can\'t browser JavaScript observe TCP retransmissions or packet loss?',
    answer:
      'The browser security and sandbox model exposes only Layer 7 (Application) abstractions via Fetch and Resource Timing APIs. Raw Ethernet frames, IP routing, TCP sequence numbers, and kernel retransmission timers are handled by the OS kernel and network stack, requiring packet capture tools like Wireshark or raw socket code.',
  },
  {
    category: 'Integrity',
    question: 'Why is SHA-256 integrity verification distinct from authentication or encryption?',
    answer:
      'SHA-256 produces a deterministic digest proving that received bytes match expected bytes (detecting corruption or partial transfer). However, a checksum alone does not prove the sender is authentic (no digital signature) nor does it conceal the plaintext from eavesdroppers (not encryption).',
  },
  {
    category: 'Security',
    question: 'What is the difference between HTTP 401 Unauthorized and 403 Forbidden?',
    answer:
      '401 indicates that authentication credentials are missing or invalid (the caller must authenticate). 403 indicates that the user is authenticated and recognized, but lacks authorization permissions to access or mutate the requested resource.',
  },
]

export default function ProtocolsPage() {
  const [selectedLayer, setSelectedLayer] = useState<'l7' | 'l6' | 'l4' | 'l3'>('l7')
  const [activeStep, setActiveStep] = useState<number>(0)
  const [expandedVivaIndex, setExpandedVivaIndex] = useState<number | null>(null)

  const LIFECYCLE_STEPS = [
    {
      title: '1. User Initiates Upload',
      layer: 'Layer 7 (Application)',
      desc: 'User drops a file into NetShare. The client immediately invokes performance.now() to establish a monotonic reference timestamp.',
    },
    {
      title: '2. Client-Side SHA-256',
      layer: 'Layer 7 (Web Crypto API)',
      desc: 'The browser streams the file through crypto.subtle.digest to compute an independent 256-bit hash before sending any bytes over the network.',
    },
    {
      title: '3. DNS Resolution & Cache',
      layer: 'DNS / Transport',
      desc: 'The browser checks its internal DNS cache. If expired or cold, an A/AAAA record lookup resolves the IP address of the NetShare endpoint.',
    },
    {
      title: '4. TCP Handshake & TLS 1.3',
      layer: 'Layer 4 (TCP) & Layer 6 (TLS)',
      desc: 'SYN -> SYN-ACK -> ACK completes the 3-way handshake (1 RTT). An ephemeral Diffie-Hellman key exchange establishes symmetric encryption keys.',
    },
    {
      title: '5. Direct Object Transfer',
      layer: 'Layer 7 (HTTP PUT / POST)',
      desc: 'The file payload streams directly to private Supabase Object Storage using an authenticated session bearer token, avoiding serverless buffer proxy limits.',
    },
    {
      title: '6. Metadata Registration',
      layer: 'PostgreSQL & RLS',
      desc: 'POST /api/files registers file metadata (size, MIME, checksum). Row Level Security ensures the owner_id matches auth.uid().',
    },
    {
      title: '7. Telemetry Ingestion',
      layer: 'Layer 7 Telemetry',
      desc: 'Observed transfer bytes and high-resolution duration are dispatched to /api/telemetry and reflected in the live Network Dashboard.',
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-400" />
          Interactive Protocol Explorer
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Comprehensive exploration of the networking protocol stack from Application (L7) down to Network (L3).
        </p>
      </div>

      {/* ─── Layer Selector & Deep Dive ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Layer Selection Stack */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            OSI / TCP-IP Protocol Stack
          </h2>

          {[
            {
              id: 'l7',
              name: 'Layer 7: Application',
              protocols: 'HTTP/1.1 • HTTP/2 • HTTP/3',
              color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
              badge: 'REST & Fetch API',
            },
            {
              id: 'l6',
              name: 'Layer 6: Presentation / Security',
              protocols: 'TLS 1.3 • HTTPS • AES-GCM',
              color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
              badge: 'Symmetric & Asymmetric Crypto',
            },
            {
              id: 'l4',
              name: 'Layer 4: Transport',
              protocols: 'TCP • UDP • QUIC',
              color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
              badge: 'Byte Streams & Framing',
            },
            {
              id: 'l3',
              name: 'Layer 3: Network',
              protocols: 'IPv4 • IPv6 • Routing & TTL',
              color: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
              badge: 'Packets & MTU',
            },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedLayer(l.id as any)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                selectedLayer === l.id
                  ? `${l.color} shadow-lg shadow-blue-500/5`
                  : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-white">{l.name}</span>
                <Badge variant="outline" className="text-[10px] border-slate-700">
                  {l.badge}
                </Badge>
              </div>
              <p className="font-mono text-[11px] text-slate-400">{l.protocols}</p>
            </button>
          ))}
        </div>

        {/* Detailed Explanation for Selected Layer */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          {selectedLayer === 'l7' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-400" /> Layer 7: HTTP & Application Semantics
                </h3>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs font-mono">
                  HTTP/1.1 vs HTTP/2 vs HTTP/3
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-blue-400">HTTP/1.1 (1997)</span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Text-based headers. Single request-response cycle per connection by default unless keep-alive is maintained. Suffers from head-of-line blocking at the HTTP layer.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400">HTTP/2 (2015)</span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Binary framing layer. Multiplexes multiple streams over a single TCP connection. Uses HPACK header compression. Still suffers from TCP-level head-of-line blocking on packet drops.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-indigo-400">HTTP/3 (2022)</span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Built on QUIC over UDP. Streams are independent at the transport layer, completely eliminating head-of-line blocking across connections. Features 0-RTT connection resumption.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h4 className="font-semibold text-slate-200">How NetShare Implements L7:</h4>
                <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
                  <li>Direct authenticated file uploads bypass function body proxy limits.</li>
                  <li>Strict HTTP status code discipline (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 410 Gone).</li>
                  <li>Monotonic timing benchmarks capture exact application durations with <code className="text-blue-400">performance.now()</code>.</li>
                </ul>
              </div>
            </div>
          )}

          {selectedLayer === 'l6' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" /> Layer 6: TLS 1.3 & HTTPS Encryption
                </h3>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-mono">
                  End-to-End Cryptography
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> 1-RTT Handshake
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    TLS 1.3 reduces the handshake from 2 round trips (in TLS 1.2) to just 1 RTT. Ephemeral Diffie-Hellman keys are exchanged immediately during the ClientHello, providing Forward Secrecy.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> AEAD Symmetric Ciphers
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Once the session key is derived, data is encrypted and authenticated using AES-256-GCM or ChaCha20-Poly1305. Payloads in transit cannot be read or forged by intermediate routers.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-200">Browser Security vs Wireshark:</span>
                <p className="text-[11px] leading-relaxed">
                  In a Wireshark capture of HTTPS traffic, all HTTP payloads and URL paths appear as encrypted application data. To demonstrate inspectable protocol frames and raw socket behaviors, NetShare provides the standalone <strong>Python TCP Socket Lab</strong>.
                </p>
              </div>
            </div>
          )}

          {selectedLayer === 'l4' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Server className="h-5 w-5 text-amber-400" /> Layer 4: TCP vs UDP Transport Mechanisms
                </h3>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-mono">
                  Socket Programming & Framing
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-amber-400">Transmission Control Protocol (TCP)</span>
                  <ul className="text-slate-400 text-[11px] space-y-1 list-disc list-inside">
                    <li>3-way handshake: SYN → SYN-ACK → ACK</li>
                    <li>Guaranteed in-order delivery via Sequence & ACK numbers</li>
                    <li>Sliding window flow control & Slow-Start congestion avoidance</li>
                    <li>Teardown via FIN / ACK or emergency RST</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-indigo-400">User Datagram Protocol (UDP)</span>
                  <ul className="text-slate-400 text-[11px] space-y-1 list-disc list-inside">
                    <li>No connection establishment (zero handshake overhead)</li>
                    <li>Datagram preservation: recvfrom() returns exact sent packets</li>
                    <li>No retransmission, ordering, or congestion management</li>
                    <li>Foundational layer for DNS, WebRTC, and QUIC (HTTP/3)</li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300">
                <span className="font-semibold block mb-1">Why TCP requires NetShare Framing:</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  TCP is a byte stream with no knowledge of records. NetShare defines the <code className="text-amber-400 font-mono">NSHR</code> binary frame header (Magic + Version + Type + 32-bit Payload Length) to ensure safe, bounded parsing over TCP sockets.
                </p>
              </div>
            </div>
          )}

          {selectedLayer === 'l3' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Network className="h-5 w-5 text-purple-400" /> Layer 3: IP Addressing & Packet Routing
                </h3>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs font-mono">
                  IP Datagrams & MTU
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h4 className="font-semibold text-slate-200">MTU & Maximum Segment Size (MSS):</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Standard Ethernet networks have a Maximum Transmission Unit (MTU) of <strong>1500 bytes</strong>. After deducting 20 bytes of IPv4 header and 20 bytes of TCP header, the default Maximum Segment Size (MSS) is <strong>1460 bytes</strong>. Large file transfers are fragmented into thousands of MSS-sized TCP segments across the network.
                </p>
                <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between font-mono text-[10px] text-slate-400">
                  <span>Ethernet Frame (1518B)</span>
                  <span>IP Packet (1500B)</span>
                  <span>TCP Segment (1460B MSS)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── End-to-End Request Lifecycle Stepper ────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-400" />
            End-to-End File Transfer Lifecycle
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step walkthrough of what happens beneath the surface during a NetShare file transfer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
          {LIFECYCLE_STEPS.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeStep === idx
                  ? 'border-blue-500 bg-blue-500/15 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono text-blue-400 mb-1">Step {idx + 1}</div>
              <div className="font-semibold text-xs truncate text-slate-200">{step.title.split('. ')[1]}</div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">{step.layer}</div>
            </button>
          ))}
        </div>

        {/* Selected Step Explanation Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600/30 text-blue-300 border-blue-500/40 text-[10px] font-mono">
              {LIFECYCLE_STEPS[activeStep].layer}
            </Badge>
            <h4 className="font-bold text-sm text-white">{LIFECYCLE_STEPS[activeStep].title}</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            {LIFECYCLE_STEPS[activeStep].desc}
          </p>
        </div>
      </div>

      {/* ─── Viva / Project Defense Preparation ───────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            Project Viva & Defense Technical Reference
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Key theoretical and practical questions prepared directly from the NetShare Computer Networks syllabus.
          </p>
        </div>

        <div className="space-y-2.5">
          {VIVA_TOPICS.map((item, idx) => {
            const isExpanded = expandedVivaIndex === idx
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedVivaIndex(isExpanded ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-900/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 shrink-0">
                      {item.category}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {item.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180 text-blue-400' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-900 bg-slate-900/20">
                    {item.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
