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

    const { data: experiments, error } = await supabase
      .from('experiments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: experiments ?? [] })
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
    const { experimentType, parameters, results } = body

    if (!experimentType || typeof experimentType !== 'string') {
      return NextResponse.json(
        { error: { message: 'Missing or invalid experimentType.', status: 400 } },
        { status: 400 }
      )
    }

    const { data: experiment, error } = await supabase
      .from('experiments')
      .insert({
        user_id: user.id,
        experiment_type: experimentType,
        parameters: parameters || {},
        results: results || {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: experiment }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}
