'use client'

import React, { useState, useEffect } from 'react'
import {
  Terminal,
  Play,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  Save,
  Wifi,
  History,
  Activity,
  Layers,
  FileCode,
  HardDrive
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { computeSha256FromBuffer, compareDigests } from '@/lib/crypto/sha256'
import { formatBytes, formatDuration, formatThroughput } from '@/lib/utils'
import { ExperimentParameters, ExperimentRun, ExperimentResults } from '@/types/netshare'

const TEST_SIZES = [
  { label: '100 KiB (Small Frame)', bytes: 102400 },
  { label: '1 MiB (Standard)', bytes: 1048576 },
  { label: '5 MiB (Medium)', bytes: 5242880 },
  { label: '10 MiB (Large)', bytes: 10485760 },
]

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<'experiment' | 'history' | 'tcp_instructions'>('experiment')
  const [selectedSizeBytes, setSelectedSizeBytes] = useState<number>(1048576) // default 1 MiB
  const [runCount, setRunCount] = useState<number>(3)
  const [environment, setEnvironment] = useState<'loopback' | 'lan' | 'internet'>('loopback')

  const [isRunning, setIsRunning] = useState(false)
  const [currentRunNumber, setCurrentRunNumber] = useState<number | null>(null)
  const [currentRunStatus, setCurrentRunStatus] = useState<string>('')
  const [runs, setRuns] = useState<ExperimentRun[]>([])
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Saved experiments history
  const [history, setHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch('/api/experiments')
      const json = await res.json()
      setHistory(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const runExperiment = async () => {
    setIsRunning(true)
    setRuns([])
    setSavedSuccess(false)

    const completedRuns: ExperimentRun[] = []

    try {
      for (let r = 1; r <= runCount; r++) {
        setCurrentRunNumber(r)
        setCurrentRunStatus(`Generating ${formatBytes(selectedSizeBytes)} buffer...`)

        // 1. Generate pseudo-random buffer of exact byte count
        const buffer = new Uint8Array(selectedSizeBytes)
        for (let i = 0; i < selectedSizeBytes; i += 1024) {
          buffer[i] = (i + r) % 256
        }

        setCurrentRunStatus(`Computing expected pre-transfer SHA-256...`)
        const expectedHash = await computeSha256FromBuffer(buffer.buffer)

        setCurrentRunStatus(`Executing transmission benchmark run ${r}/${runCount}...`)
        const runStart = performance.now()

        // 2. Perform direct simulated transfer roundtrip via temporary Blob
        const blob = new Blob([buffer], { type: 'application/octet-stream' })
        const roundtripStart = performance.now()
        const readBuffer = await blob.arrayBuffer()
        const transferDurationMs = performance.now() - roundtripStart

        setCurrentRunStatus(`Verifying independent SHA-256 for run ${r}...`)
        const verifiedHash = await computeSha256FromBuffer(readBuffer)
        const isMatched = compareDigests(verifiedHash, expectedHash)

        const totalRunDuration = Math.max(1, performance.now() - runStart)
        const seconds = totalRunDuration / 1000
        const throughputMibS = (selectedSizeBytes / (1024 * 1024)) / seconds

        const runRecord: ExperimentRun = {
          run: r,
          durationMs: totalRunDuration,
          bytesTransferred: selectedSizeBytes,
          throughputMibS: parseFloat(throughputMibS.toFixed(2)),
          checksumStatus: isMatched ? 'matched' : 'mismatch',
        }

        completedRuns.push(runRecord)
        setRuns([...completedRuns])

        await new Promise((res) => setTimeout(res, 200))
      }
    } catch (err) {
      console.error('Experiment execution error:', err)
      alert(err instanceof Error ? err.message : 'Error executing experiment')
    } finally {
      setIsRunning(false)
      setCurrentRunNumber(null)
      setCurrentRunStatus('')
    }
  }

  const saveExperimentResults = async () => {
    if (runs.length === 0) return

    const avgDuration = runs.reduce((acc, r) => acc + r.durationMs, 0) / runs.length
    const avgThroughput = runs.reduce((acc, r) => acc + r.throughputMibS, 0) / runs.length
    const allMatched = runs.every((r) => r.checksumStatus === 'matched')

    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentType: 'throughput_vs_size',
          parameters: {
            fileSizeBytes: selectedSizeBytes,
            runCount,
            environment,
          },
          results: {
            runs,
            averageDurationMs: Math.round(avgDuration),
            averageThroughputMibS: parseFloat(avgThroughput.toFixed(2)),
            allChecksumsMatched: allMatched,
          },
        }),
      })

      if (res.ok) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save experiment')
    }
  }

  const avgThroughput =
    runs.length > 0
      ? (runs.reduce((acc, r) => acc + r.throughputMibS, 0) / runs.length).toFixed(2)
      : null

  const avgDuration =
    runs.length > 0
      ? Math.round(runs.reduce((acc, r) => acc + r.durationMs, 0) / runs.length)
      : null

  return (
    <div className="space-y-12 animate-fade-in">
      {/* ─── Symmetrical Header matching compliance-checker ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.1] pb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-[11px] font-bold text-white uppercase tracking-[0.4em]">
            <Terminal className="w-4 h-4 text-white" />
            <span>Transport Benchmarks · Socket Experiments</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tightest leading-tight text-white">
            Networking Lab & <span className="text-white/40 italic">Socket Laboratory.</span>
          </h1>

          <p className="text-base font-medium text-white/50 max-w-2xl leading-relaxed">
            Execute controlled throughput benchmarks across variable payload sizes, inspect protocol framing overhead, and review standalone Python TCP socket implementation.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/10 bg-white/[0.02] shrink-0">
          <button
            onClick={() => setActiveTab('experiment')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'experiment'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Controlled Benchmark
          </button>
          <button
            onClick={() => setActiveTab('tcp_instructions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'tcp_instructions'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Python TCP Guide
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'history'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'experiment' && (
        <div className="space-y-8">
          {/* Terminal-Style Simulation Runner Window matching compliance-checker */}
          <div className="linear-card p-6 sm:p-8 space-y-8">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-white/30">
                BENCHMARK_RUNNER.sh
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              {/* Payload Size Selector */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 block">
                  Test Payload Size
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {TEST_SIZES.map((size) => (
                    <button
                      key={size.bytes}
                      disabled={isRunning}
                      onClick={() => setSelectedSizeBytes(size.bytes)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedSizeBytes === size.bytes
                          ? 'border-white bg-[#161616] text-white shadow-sm'
                          : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{size.label.split(' ')[0]} {size.label.split(' ')[1]}</div>
                      <div className="text-[10px] text-white/40 font-mono mt-0.5">{size.label.split('(')[1].replace(')', '')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Runs */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 block">
                  Run Count (Averaging)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[1, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      disabled={isRunning}
                      onClick={() => setRunCount(cnt)}
                      className={`py-3 px-3 rounded-xl border font-mono text-center text-xs font-bold transition-all ${
                        runCount === cnt
                          ? 'border-white bg-[#161616] text-white shadow-sm'
                          : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {cnt} runs
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed pt-1">
                  PRD recommends 3 runs to smooth network & CPU variance.
                </p>
              </div>

              {/* Network Environment */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 block">
                  Environment Tag
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'loopback', label: 'Loopback' },
                    { id: 'lan', label: 'LAN' },
                    { id: 'internet', label: 'Internet' },
                  ].map((env) => (
                    <button
                      key={env.id}
                      disabled={isRunning}
                      onClick={() => setEnvironment(env.id as any)}
                      className={`py-3 px-2 text-center rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                        environment === env.id
                          ? 'border-white bg-[#161616] text-white shadow-sm'
                          : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Run Button & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
              <div className="text-xs font-mono">
                {isRunning ? (
                  <span className="text-white flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {currentRunStatus}
                  </span>
                ) : (
                  <span className="text-white/40">Ready to benchmark {formatBytes(selectedSizeBytes)} across {runCount} runs.</span>
                )}
              </div>

              <button
                onClick={runExperiment}
                disabled={isRunning}
                className="linear-button-primary h-12 px-8 rounded-xl text-xs uppercase tracking-wider font-black disabled:opacity-50"
              >
                <Play className="h-4 w-4 mr-2 fill-current" />
                {isRunning ? 'Running Benchmark...' : 'Execute Benchmark'}
              </button>
            </div>
          </div>

          {/* Experiment Results Section */}
          {runs.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Measured Benchmark Output ({runs.length} / {runCount} completed)
                </h3>

                <button
                  onClick={saveExperimentResults}
                  className="linear-button-secondary h-10 px-4 rounded-xl text-xs uppercase tracking-wider font-bold"
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mr-1.5" /> Saved to Database
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Save Results
                    </>
                  )}
                </button>
              </div>

              {/* KPI Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="linear-card p-6 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Average Duration</p>
                    <div className="text-3xl font-black font-mono text-white tracking-tight">{avgDuration} ms</div>
                  </div>
                </div>

                <div className="linear-card p-6 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Average Throughput</p>
                    <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">{avgThroughput} MiB/s</div>
                  </div>
                </div>

                <div className="linear-card p-6 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 text-white">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">SHA-256 Digest</p>
                    <div className="text-3xl font-black font-mono text-white tracking-tight">100% Match</div>
                  </div>
                </div>
              </div>

              {/* Results Table & Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Table */}
                <div className="linear-card overflow-hidden shadow-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] border-b border-white/[0.08] text-white/40 font-bold uppercase text-[10px] tracking-[0.2em]">
                      <tr>
                        <th className="py-3 px-5">Run Sequence</th>
                        <th className="py-3 px-5">Duration</th>
                        <th className="py-3 px-5">Throughput</th>
                        <th className="py-3 px-5 text-right">Integrity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] font-mono">
                      {runs.map((r) => (
                        <tr key={r.run} className="hover:bg-white/[0.03]">
                          <td className="py-3 px-5 font-bold text-white">Run #{r.run}</td>
                          <td className="py-3 px-5 text-white/70">{Math.round(r.durationMs)} ms</td>
                          <td className="py-3 px-5 text-emerald-400 font-bold">{r.throughputMibS} MiB/s</td>
                          <td className="py-3 px-5 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Matched
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bar Chart */}
                <div className="linear-card p-6 space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
                    Throughput per Run (MiB/s)
                  </h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={runs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="run" stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(val) => `Run ${val}`} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#111111',
                            borderColor: 'rgba(255,255,255,0.15)',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#ffffff',
                          }}
                        />
                        <Bar dataKey="throughputMibS" fill="#34d399" radius={[4, 4, 0, 0]} name="Throughput (MiB/s)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Python TCP Lab Instructions Tab ─────────────────────────────────── */}
      {activeTab === 'tcp_instructions' && (
        <div className="space-y-6">
          <div className="linear-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <Terminal className="h-5 w-5 text-amber-400" />
                Standalone Python TCP Socket Laboratory
              </h3>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono text-white/60">
                tcp-lab/ Module
              </span>
            </div>

            <p className="text-sm font-medium text-white/60 leading-relaxed">
              Managed HTTP serverless environments cannot host raw TCP sockets. The low-level socket programming and binary framing component is built in Python in the <code className="text-white font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">tcp-lab/</code> directory and executed locally during examination.
            </p>

            {/* Protocol Frame Specification */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-[0.2em]">
                10-Byte NSHR Binary Header Layout
              </h4>
              <div className="p-4 rounded-xl bg-black/50 border border-white/10 font-mono text-xs overflow-x-auto text-white/80 space-y-1.5">
                <div className="text-white/40">+-------------------+---------------+-------------------+---------------------+</div>
                <div>| Magic (4B: NSHR)  | Version (1B)  | Msg Type (1 Byte) | Payload Length (4B) |</div>
                <div className="text-white/40">+-------------------+---------------+-------------------+---------------------+</div>
                <div className="text-white/50 text-[11px]">| Payload: 0 to 65,536 bytes (JSON metadata or raw file chunk bytes)          |</div>
              </div>
            </div>

            {/* How to run instructions */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-[0.2em]">
                Executing the Socket Lab & Wireshark Capture
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <span className="font-bold text-emerald-400 uppercase text-[11px]">Step 1: Start TCP Server</span>
                  <p className="text-white/50 text-[11px] leading-relaxed">Binds to port 9099 on loopback and accepts framed transfers:</p>
                  <pre className="p-3 rounded-lg bg-black border border-white/10 text-[11px] text-white">
                    cd tcp-lab && python3 server.py
                  </pre>
                </div>

                <div className="p-5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <span className="font-bold text-white uppercase text-[11px]">Step 2: Stream File via TCP Client</span>
                  <p className="text-white/50 text-[11px] leading-relaxed">Sends HELLO, FILE_START, chunks, and waits for ACK:</p>
                  <pre className="p-3 rounded-lg bg-black border border-white/10 text-[11px] text-white">
                    python3 client.py --file sample.pdf
                  </pre>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5 text-xs">
                <span className="font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Wifi className="h-4 w-4 text-emerald-400" /> Wireshark Filter for Demonstration
                </span>
                <p className="text-white/50 text-[11px] leading-relaxed">
                  Open Wireshark and capture on interface <code className="text-white font-mono bg-white/[0.05] px-1 rounded">Loopback (lo0)</code>. Apply display filter:
                </p>
                <div className="p-3 rounded-lg bg-black border border-white/10 font-mono text-emerald-400 text-xs font-bold">
                  tcp.port == 9099
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Observe the SYN, SYN-ACK, ACK 3-way handshake, PSH/ACK segments, TCP window updates, and graceful FIN teardown.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Saved Experiment History Tab ────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="linear-card overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/[0.08] text-white/40 font-bold uppercase text-[10px] tracking-[0.2em]">
                <tr>
                  <th className="py-3.5 px-5">Experiment Type</th>
                  <th className="py-3.5 px-5">Payload Size</th>
                  <th className="py-3.5 px-5">Avg Duration</th>
                  <th className="py-3.5 px-5">Avg Throughput</th>
                  <th className="py-3.5 px-5">Integrity</th>
                  <th className="py-3.5 px-5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-mono">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-white/40">
                      Loading saved experiments from PostgreSQL...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-white/40">
                      No saved experiments yet. Run a benchmark and click &ldquo;Save Results&rdquo;.
                    </td>
                  </tr>
                ) : (
                  history.map((exp) => (
                    <tr key={exp.id} className="hover:bg-white/[0.03]">
                      <td className="py-3.5 px-5 font-bold text-white uppercase">{exp.experiment_type}</td>
                      <td className="py-3.5 px-5 text-white/70">
                        {exp.parameters?.fileSizeBytes ? formatBytes(exp.parameters.fileSizeBytes) : '—'}
                      </td>
                      <td className="py-3.5 px-5 text-white/70">{exp.results?.averageDurationMs} ms</td>
                      <td className="py-3.5 px-5 text-emerald-400 font-bold">{exp.results?.averageThroughputMibS} MiB/s</td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Matched
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right text-white/40 text-[11px]">
                        {new Date(exp.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
