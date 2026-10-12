'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Terminal
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Network Activity & Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Measured HTTP transfer durations, effective throughput calculations, and request inspector.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadTelemetry}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

      {/* ─── KPI Metric Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Transferred</span>
            <HardDrive className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {summary ? formatBytes(summary.totalBytesTransferred) : '0 B'}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {summary ? summary.totalBytesTransferred.toLocaleString() : 0} bytes
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Throughput</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {summary?.averageThroughputMibS ? `${summary.averageThroughputMibS} MiB/s` : '—'}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Application-layer speed
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Latency</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {summary?.averageDurationMs ? `${summary.averageDurationMs} ms` : '—'}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Monotonic duration
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {summary ? `${summary.successRate}%` : '100%'}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {summary ? `${summary.successCount} of ${summary.totalTransfers} OK` : '0 operations'}
          </p>
        </div>
      </div>

      {/* ─── Recharts Visualization Charts ───────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Latency per Operation Chart */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-blue-400" /> Operation Latency (ms)
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Recent Transactions</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.slice(-15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="index" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    labelFormatter={(val) => `Operation #${val}`}
                  />
                  <Bar dataKey="durationMs" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Duration (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Effective Throughput Chart */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Throughput (MiB/s)
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Transfer Speed Trend</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-15)}>
                  <defs>
                    <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="index" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    labelFormatter={(val) => `Operation #${val}`}
                  />
                  <Area type="monotone" dataKey="throughputMibS" stroke="#10b981" fillOpacity={1} fill="url(#throughputGrad)" name="Throughput (MiB/s)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── Telemetry Table & Filter ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recorded Operation Logs ({logs.length})
          </h3>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 overflow-x-auto text-xs">
            {['all', 'upload', 'download', 'rename', 'delete', 'share', 'tcp_test'].map((op) => (
              <button
                key={op}
                onClick={() => setOperationFilter(op)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  operationFilter === op
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {op.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Operation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 hidden sm:table-cell">Duration</th>
                <th className="py-3 px-4 hidden md:table-cell">Bytes</th>
                <th className="py-3 px-4 hidden lg:table-cell">Effective Speed</th>
                <th className="py-3 px-4 hidden sm:table-cell">Timestamp</th>
                <th className="py-3 px-4 text-right">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No recorded operations yet. Upload or download a file to generate real telemetry.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isOk = (!log.status_code || log.status_code < 400) && !log.error_code
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLogForInspection(log)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-200">
                        <span className="text-blue-400 font-bold uppercase">{log.operation}</span>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {log.status_code ? (
                          <Badge
                            className={`text-[10px] ${
                              isOk
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                          >
                            {log.status_code}
                          </Badge>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 hidden sm:table-cell font-mono text-slate-300">
                        {formatDuration(log.duration_ms)}
                      </td>

                      <td className="py-3 px-4 hidden md:table-cell font-mono text-slate-400">
                        {formatBytes(log.bytes_transferred)}
                      </td>

                      <td className="py-3 px-4 hidden lg:table-cell font-mono text-slate-400">
                        {formatThroughput(log.bytes_transferred, log.duration_ms || 0)}
                      </td>

                      <td className="py-3 px-4 hidden sm:table-cell text-slate-500 text-[11px]">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 group-hover:text-blue-300 font-medium">
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
