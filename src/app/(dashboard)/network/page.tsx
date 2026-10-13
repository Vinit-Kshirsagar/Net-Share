'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Zap,
  BarChart3
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { RequestInspectorDrawer } from '@/components/request-inspector/inspector-drawer'
import { TransferLogRow } from '@/types/netshare'
import { formatBytes, formatDuration, formatDate, formatThroughput } from '@/lib/utils'

interface SummaryData {
  totalTransfers: number
  totalBytesTransferred: number
  successCount: number
  errorCount: number
  averageDurationMs: number | null
  averageThroughputMibS: number | null
  successRate: number
}

interface ChartPoint {
  id: string
  operation: string
  index: number
  time: string
  durationMs: number
  bytesTransferred: number
  throughputMibS: number
  statusCode: number | null
}

export default function NetworkPage() {
  const [logs, setLogs] = useState<TransferLogRow[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [operationFilter, setOperationFilter] = useState<string>('all')
  const [selectedLogForInspection, setSelectedLogForInspection] = useState<TransferLogRow | null>(null)

  const loadTelemetry = useCallback(async () => {
    setIsLoading(true)
    try {
      const opQuery = operationFilter !== 'all' ? `?operation=${operationFilter}` : ''
      const [logsRes, summaryRes] = await Promise.all([
        fetch(`/api/telemetry${opQuery}`),
        fetch('/api/telemetry/summary'),
      ])

      const logsData = await logsRes.json()
      const summaryData = await summaryRes.json()

      setLogs(logsData.data || [])
      if (summaryData.data) {
        setSummary(summaryData.data.summary)
        setChartData(summaryData.data.chartData || [])
      }
    } catch (err) {
      console.error('Failed to load network telemetry:', err)
    } finally {
      setIsLoading(false)
    }
  }, [operationFilter])

  useEffect(() => {
    loadTelemetry()
  }, [loadTelemetry])

  return (
    <div className="space-y-12 animate-fade-in">
      {/* ─── Symmetrical Header matching compliance-checker ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.1] pb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-[11px] font-bold text-white uppercase tracking-[0.4em]">
            <Activity className="w-4 h-4 text-white" />
            <span>Telemetry Pipeline · Real-Time HTTP Metrics</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tightest leading-tight text-white">
            Network Activity & <span className="text-white/40 italic">Telemetry Engine.</span>
          </h1>

          <p className="text-base font-medium text-white/50 max-w-2xl leading-relaxed">
            High-resolution monotonic duration tracking via <code className="font-mono text-white/70">performance.now()</code>, application throughput calculations, and deep Layer 7 request inspection.
          </p>
        </div>

        <button
          onClick={loadTelemetry}
          className="linear-button-secondary h-11 px-5 rounded-xl text-xs uppercase tracking-wider shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* ─── 4-Column Metric Grid matching compliance-checker MetricCard ──── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="linear-card p-6 flex items-center gap-5 hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 text-white">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Total Transferred</p>
            <div className="text-3xl font-black text-white tracking-tight font-mono">
              {summary ? formatBytes(summary.totalBytesTransferred) : '0 B'}
            </div>
            <p className="text-[10px] text-white/30 font-mono">
              {summary ? summary.totalBytesTransferred.toLocaleString() : 0} bytes
            </p>
          </div>
        </div>

        <div className="linear-card p-6 flex items-center gap-5 hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Avg Throughput</p>
            <div className="text-3xl font-black text-white tracking-tight font-mono">
              {summary?.averageThroughputMibS ? `${summary.averageThroughputMibS} MiB/s` : '—'}
            </div>
            <p className="text-[10px] text-white/30 font-mono">
              Effective L7 Bandwidth
            </p>
          </div>
        </div>

        <div className="linear-card p-6 flex items-center gap-5 hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Avg Duration</p>
            <div className="text-3xl font-black text-white tracking-tight font-mono">
              {summary?.averageDurationMs ? `${summary.averageDurationMs} ms` : '—'}
            </div>
            <p className="text-[10px] text-white/30 font-mono">
              Monotonic Latency
            </p>
          </div>
        </div>

        <div className="linear-card p-6 flex items-center gap-5 hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 text-white">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Success Rate</p>
            <div className="text-3xl font-black text-white tracking-tight font-mono">
              {summary ? `${summary.successRate}%` : '100%'}
            </div>
            <p className="text-[10px] text-white/30 font-mono">
              {summary ? `${summary.successCount} / ${summary.totalTransfers} OK` : '0 operations'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Recharts Visualization HUD ─────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latency per Operation */}
          <div className="linear-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-white" /> Operation Latency (ms)
              </h3>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Recent Transactions</span>
            </div>
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.slice(-15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="index" stroke="rgba(255,255,255,0.3)" fontSize={10} fontVariant="mono" />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} fontVariant="mono" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#ffffff',
                    }}
                    labelFormatter={(val) => `Operation #${val}`}
                  />
                  <Bar dataKey="durationMs" fill="#ffffff" radius={[4, 4, 0, 0]} name="Duration (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Effective Throughput */}
          <div className="linear-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Effective Throughput (MiB/s)
              </h3>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Bandwidth Trend</span>
            </div>
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-15)}>
                  <defs>
                    <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="index" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#ffffff',
                    }}
                    labelFormatter={(val) => `Operation #${val}`}
                  />
                  <Area type="monotone" dataKey="throughputMibS" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#throughputGrad)" name="Throughput (MiB/s)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── Telemetry Table & Filters ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            Recorded Telemetry Logs ({logs.length})
          </h3>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
            {['all', 'upload', 'download', 'rename', 'delete', 'share', 'tcp_test'].map((op) => (
              <button
                key={op}
                onClick={() => setOperationFilter(op)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  operationFilter === op
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {op.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="linear-card overflow-hidden shadow-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/[0.08] text-white/40 font-bold uppercase text-[10px] tracking-[0.2em]">
              <tr>
                <th className="py-3.5 px-5">Operation</th>
                <th className="py-3.5 px-5">Status Code</th>
                <th className="py-3.5 px-5 hidden sm:table-cell">Duration</th>
                <th className="py-3.5 px-5 hidden md:table-cell">Payload Bytes</th>
                <th className="py-3.5 px-5 hidden lg:table-cell">Throughput</th>
                <th className="py-3.5 px-5 hidden sm:table-cell">Timestamp</th>
                <th className="py-3.5 px-5 text-right">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-white/40 text-sm font-medium">
                    No recorded operations yet. Upload or download a file to generate live telemetry.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isOk = (!log.status_code || log.status_code < 400) && !log.error_code
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLogForInspection(log)}
                      className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-white">
                        <span className="uppercase text-white group-hover:text-white">{log.operation}</span>
                      </td>

                      <td className="py-3.5 px-5 font-mono">
                        {log.status_code ? (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isOk
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {log.status_code}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 hidden sm:table-cell font-mono text-white/70">
                        {formatDuration(log.duration_ms)}
                      </td>

                      <td className="py-3.5 px-5 hidden md:table-cell font-mono text-white/50">
                        {formatBytes(log.bytes_transferred)}
                      </td>

                      <td className="py-3.5 px-5 hidden lg:table-cell font-mono text-white/50">
                        {formatThroughput(log.bytes_transferred, log.duration_ms || 0)}
                      </td>

                      <td className="py-3.5 px-5 hidden sm:table-cell text-white/40 text-[11px] font-mono">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/60 group-hover:text-white font-bold uppercase tracking-wider">
                          Inspect <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Request Inspector Drawer ────────────────────────────────────────── */}
      <RequestInspectorDrawer
        open={!!selectedLogForInspection}
        onOpenChange={(open) => !open && setSelectedLogForInspection(null)}
        log={selectedLogForInspection}
      />
    </div>
  )
}
