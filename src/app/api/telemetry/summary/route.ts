import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized.', status: 401 } },
        { status: 401 }
      )
    }

    const { data: logs, error } = await supabase
      .from('transfer_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    const totalTransfers = logs ? logs.length : 0
    let totalBytesTransferred = 0
    let successCount = 0
    let errorCount = 0
    let totalDurationMs = 0
    let validDurationCount = 0

    // Time-series points for graphs
    const chartData = (logs || []).map((log, index) => {
      const bytes = log.bytes_transferred || 0
      const duration = log.duration_ms || 0
      const seconds = duration / 1000
      const throughputMibS = seconds > 0 && bytes > 0 ? (bytes / (1024 * 1024)) / seconds : 0

      totalBytesTransferred += bytes
      if ((log.status_code && log.status_code < 400) && !log.error_code) {
        successCount++
      } else {
        errorCount++
      }

      if (duration > 0) {
        totalDurationMs += duration
        validDurationCount++
      }

      return {
        id: log.request_id,
        operation: log.operation,
        index: index + 1,
        time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        durationMs: Math.round(duration),
        bytesTransferred: bytes,
        throughputMibS: parseFloat(throughputMibS.toFixed(2)),
        statusCode: log.status_code,
      }
    })

    const averageDurationMs = validDurationCount > 0 ? totalDurationMs / validDurationCount : null
    const successRate = totalTransfers > 0 ? (successCount / totalTransfers) * 100 : 100

    // Total average throughput across transfers with payload
    const totalSecs = totalDurationMs / 1000
    const averageThroughputMibS = totalSecs > 0 && totalBytesTransferred > 0
      ? (totalBytesTransferred / (1024 * 1024)) / totalSecs
      : null

    return NextResponse.json({
      data: {
        summary: {
          totalTransfers,
          totalBytesTransferred,
          successCount,
          errorCount,
          averageDurationMs: averageDurationMs ? Math.round(averageDurationMs) : null,
          averageThroughputMibS: averageThroughputMibS ? parseFloat(averageThroughputMibS.toFixed(2)) : null,
          successRate: parseFloat(successRate.toFixed(1)),
        },
        chartData,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}
