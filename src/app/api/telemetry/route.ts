import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const operation = searchParams.get('operation')

    let query = supabase
      .from('transfer_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (operation) {
      query = query.eq('operation', operation as any)
    }

    const { data: logs, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: logs ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()
    const { requestId, operation, statusCode, durationMs, bytesTransferred, errorCode } = body

    const validOps = ['upload', 'download', 'delete', 'rename', 'share', 'tcp_test']
    if (!operation || !validOps.includes(operation)) {
      return NextResponse.json(
        { error: { message: `Invalid operation. Must be one of: ${validOps.join(', ')}`, status: 400 } },
        { status: 400 }
      )
    }

    const { data: log, error } = await supabase
      .from('transfer_logs')
      .insert({
        user_id: user.id,
        request_id: requestId,
        operation,
        status_code: typeof statusCode === 'number' ? statusCode : null,
        duration_ms: typeof durationMs === 'number' ? durationMs : null,
        bytes_transferred: typeof bytesTransferred === 'number' ? bytesTransferred : 0,
        error_code: errorCode || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: log }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}
