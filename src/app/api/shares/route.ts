import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

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

    const { data: shares, error } = await supabase
      .from('shares')
      .select('id, file_id, expires_at, revoked_at, created_at, files(name, size_bytes)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: shares ?? [] })
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
    const { fileId, expiryHours = 24 } = body

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json(
        { error: { message: 'Missing or invalid fileId.', status: 400 } },
        { status: 400 }
      )
    }

    // Verify file exists and belongs to caller
    const { data: file, error: fileErr } = await supabase
      .from('files')
      .select('id, name')
      .eq('id', fileId)
      .eq('owner_id', user.id)
      .single()

    if (fileErr || !file) {
      return NextResponse.json(
        { error: { message: 'File not found or access denied.', status: 404 } },
        { status: 404 }
      )
    }

    // Generate high-entropy token (64 hex characters from 32 secure random bytes)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + Math.max(1, expiryHours) * 3600 * 1000).toISOString()

    const { data: share, error: shareErr } = await supabase
      .from('shares')
      .insert({
        file_id: file.id,
        owner_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (shareErr) {
      return NextResponse.json(
        { error: { message: shareErr.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          id: share.id,
          token: rawToken, // raw token provided only once at generation time
          expiresAt: share.expires_at,
          fileName: file.name,
        },
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}
