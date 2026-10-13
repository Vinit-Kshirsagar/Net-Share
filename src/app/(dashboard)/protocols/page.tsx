'use client'

import React, { useState } from 'react'
import {
  Layers,
  Shield,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Terminal,
  Activity,
  Network,
  ChevronDown,
  HelpCircle,
  FileCode,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
      'TCP provides a stream of continuous bytes without preserving application message boundaries (a write(100) on client may be received as read(40) + read(60) on server). Without a framing protocol like NetShare\'s NSHR (with magic bytes and big-endian payload length), the receiver cannot determine where one file chunk or metadata packet ends and the next begins.',
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
    <div className="space-y-12 animate-fade-in">
      {/* ─── Symmetrical Header matching compliance-checker ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.1] pb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-[11px] font-bold text-white uppercase tracking-[0.4em]">
            <Network className="w-4 h-4 text-white" />
            <span>OSI & TCP/IP Model · Conceptual Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tightest leading-tight text-white">
            Interactive <span className="text-white/40 italic">Protocol Explorer.</span>
          </h1>

          <p className="text-base font-medium text-white/50 max-w-2xl leading-relaxed">
            Examine how files traverse from Application layer (HTTP/1.1 vs HTTP/2 vs HTTP/3) down through TLS 1.3 presentation, TCP stream sockets, and IP packet transmission.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/60 font-mono shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>RFC 9110 / RFC 8446 SPEC</span>
        </div>
      </div>

      {/* ─── Layer Selector & Deep Dive Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Layer Selection Stack */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 px-1">
            Protocol Stack Hierarchy
          </h2>

          {[
            {
              id: 'l7',
              name: 'Layer 7: Application',
              protocols: 'HTTP/1.1 • HTTP/2 • HTTP/3',
              badge: 'REST & Fetch API',
            },
            {
              id: 'l6',
              name: 'Layer 6: Presentation / Security',
              protocols: 'TLS 1.3 • HTTPS • AES-GCM',
              badge: 'Symmetric & Asymmetric Crypto',
            },
            {
              id: 'l4',
              name: 'Layer 4: Transport',
              protocols: 'TCP (Stream) • UDP (QUIC Datagram)',
              badge: 'NSHR Binary Framing Lab',
            },
            {
              id: 'l3',
              name: 'Layer 3: Network / Routing',
              protocols: 'IPv4 • IPv6 • MTU Framing (1500B)',
              badge: 'Packet Fragmentation',
            },
          ].map((layer) => {
            const isSelected = selectedLayer === layer.id
            return (
              <div
                key={layer.id}
                onClick={() => setSelectedLayer(layer.id as any)}
                className={cn(
                  'linear-card p-5 cursor-pointer transition-all space-y-2 group',
                  isSelected
                    ? 'border-white bg-[#141414] shadow-xl'
                    : 'hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm font-bold tracking-tight', isSelected ? 'text-white' : 'text-white/80 group-hover:text-white')}>
                    {layer.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-white/60">
                    {layer.badge}
                  </span>
                </div>
                <p className="text-xs font-mono text-white/40">{layer.protocols}</p>
              </div>
            )
          })}
        </div>

        {/* Detailed Layer Inspection Window */}
        <div className="lg:col-span-2">
          <div className="linear-card p-6 sm:p-8 space-y-6">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-white/30">
                PROTOCOL_NODE_{selectedLayer.toUpperCase()}
              </span>
            </div>

            {selectedLayer === 'l7' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-bold tracking-widest uppercase text-white">
                    Application Layer (L7)
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)
                  </h3>
                  <p className="text-sm font-medium text-white/60 leading-relaxed">
                    NetShare transmits file payloads directly to storage via standard HTTP PUT/POST multipart streams, eliminating memory overhead on API functions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="font-bold text-white uppercase text-[11px]">HTTP/1.1 (1997)</div>
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Plaintext textual protocol. Suffers from Head-of-Line (HoL) blocking on single TCP connection; requires multiple sockets for concurrent requests.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="font-bold text-white uppercase text-[11px]">HTTP/2 (2015)</div>
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Binary framing layer multiplexes multiple streams over a single TCP connection with HPACK header compression. Still suffers TCP-level HoL blocking.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="font-bold text-emerald-400 uppercase text-[11px]">HTTP/3 (2022)</div>
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Replaces TCP with QUIC over UDP. Multiplexed streams are independent; packet loss on one stream does not stall unrelated streams.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 font-mono text-[11px]">
                  <span className="text-white/40 uppercase tracking-widest text-[10px] font-bold block">
                    Observed NetShare L7 Headers
                  </span>
                  <div className="text-white/80">POST /api/files HTTP/1.1</div>
                  <div className="text-white/40">Host: netshare.lab</div>
                  <div className="text-white/40">Content-Type: application/json</div>
                  <div className="text-white/40">Authorization: Bearer [JWT_SESSION_TOKEN]</div>
                  <div className="text-emerald-400">X-Sha256-Checksum: e3b0c44298fc1c149afbf4c8996fb92427ae...</div>
                </div>
              </div>
            )}

            {selectedLayer === 'l6' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-bold tracking-widest uppercase text-white">
                    Presentation & Security (L6)
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    Transport Layer Security (TLS 1.3)
                  </h3>
                  <p className="text-sm font-medium text-white/60 leading-relaxed">
                    NetShare mandates TLS 1.3 for all web interactions, reducing the cryptographic handshake from 2 round-trips (TLS 1.2) to 1 round-trip (1-RTT) while enforcing Forward Secrecy.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="font-bold text-white text-[11px] uppercase">1-RTT Handshake</div>
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Client Hello sends Diffie-Hellman key share immediately in the initial flight. Server responds with Server Hello and Finished in single round trip.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="font-bold text-emerald-400 text-[11px] uppercase">Removed Insecure Ciphers</div>
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Deprecated RSA key transport, static DH, CBC-mode ciphers, SHA-1, and RC4. Enforces AEAD ciphers only (AES-GCM, ChaCha20-Poly1305).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedLayer === 'l4' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-bold tracking-widest uppercase text-white">
                    Transport Layer (L4)
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    TCP Stream Mechanics & Binary Framing (NSHR)
                  </h3>
                  <p className="text-sm font-medium text-white/60 leading-relaxed">
                    TCP is a byte stream without message boundaries. NetShare implements a custom 10-byte binary header protocol in Python (<code className="font-mono text-white">tcp-lab/</code>) with loop reading (<code className="font-mono text-white">recv_exact</code>) to guarantee reliable file framing.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] space-y-2">
                  <span className="text-white/40 uppercase tracking-widest text-[10px] font-bold block">
                    NSHR 10-Byte Fixed Binary Frame Header
                  </span>
                  <div className="text-white/80">+-------------------+---------------+-------------------+---------------------+</div>
                  <div className="text-white/80">| Magic (4 bytes)   | Version (1B)  | Msg Type (1 Byte) | Payload Length (4B) |</div>
                  <div className="text-white/80">| &quot;NSHR&quot; (ASCII)    | 0x01          | 0x01-0x06         | Big-Endian uint32   |</div>
                  <div className="text-white/80">+-------------------+---------------+-------------------+---------------------+</div>
                  <div className="text-white/40">| Payload: 0 to 65,536 bytes (JSON metadata or raw file bytes)                    |</div>
                  <div className="text-white/80">+---------------------------------------------------------------------------------+</div>
                </div>
              </div>
            )}

            {selectedLayer === 'l3' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="inline-flex px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-bold tracking-widest uppercase text-white">
                    Network Layer (L3)
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    IP Addressing, MTU (1500B) & MSS (1460B)
                  </h3>
                  <p className="text-sm font-medium text-white/60 leading-relaxed">
                    At the Network layer, packets are routed using IP addresses. Standard Ethernet Maximum Transmission Unit (MTU) is 1500 bytes. With 20B IPv4 + 20B TCP header, the Maximum Segment Size (MSS) is 1460 bytes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <span className="text-white/40 text-[10px] uppercase">Ethernet MTU</span>
                    <div className="text-xl font-bold text-white">1500 Bytes</div>
                    <p className="text-white/40 text-[11px]">Maximum L3 packet size before fragmentation</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <span className="text-white/40 text-[10px] uppercase">TCP MSS</span>
                    <div className="text-xl font-bold text-white">1460 Bytes</div>
                    <p className="text-white/40 text-[11px]">Payload limit per TCP segment</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── End-to-End File Lifecycle Stepper ───────────────────────────────── */}
      <div className="space-y-6 pt-4 border-t border-white/[0.08]">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-[11px] font-bold text-white uppercase tracking-[0.4em]">
            <Activity className="w-4 h-4 text-white/60" />
            <span>Interactive Transmission Sequence</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            End-to-End File Lifecycle in NetShare
          </h2>
          <p className="text-sm font-medium text-white/50 max-w-xl">
            Step through how a single file is transferred, hashed, routed, and recorded across the networking stack.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCurrent = activeStep === idx
            return (
              <div
                key={step.title}
                onClick={() => setActiveStep(idx)}
                className={cn(
                  'linear-card p-5 cursor-pointer transition-all space-y-3 group',
                  isCurrent ? 'border-white bg-[#141414]' : 'hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                    Step {idx + 1}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-white/60">
                    {step.layer}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">{step.title}</h4>
                <p className="text-xs font-medium text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Viva & Exam Oral Preparation Cards ─────────────────────────────── */}
      <div className="space-y-6 pt-4 border-t border-white/[0.08]">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-[11px] font-bold text-white uppercase tracking-[0.4em]">
            <HelpCircle className="w-4 h-4 text-white/60" />
            <span>Evaluation & Viva Prep</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Core Networking Defense Questions
          </h2>
          <p className="text-sm font-medium text-white/50 max-w-xl">
            Key concepts evaluated during the Computer Networks lab viva presentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VIVA_TOPICS.map((topic, idx) => {
            const isExpanded = expandedVivaIndex === idx
            return (
              <div
                key={topic.question}
                onClick={() => setExpandedVivaIndex(isExpanded ? null : idx)}
                className="linear-card p-6 cursor-pointer hover:border-white/30 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                    {topic.category}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-white/40 transition-transform duration-300',
                      isExpanded ? 'rotate-180 text-white' : 'group-hover:text-white'
                    )}
                  />
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                  {topic.question}
                </h4>
                {isExpanded && (
                  <p className="text-xs font-medium text-white/70 leading-relaxed pt-2 border-t border-white/[0.08] animate-in fade-in">
                    {topic.answer}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
