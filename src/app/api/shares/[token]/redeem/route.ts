import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: { message: 'Invalid token parameter.', status: 400 } },
        { status: 400 }
      )
    }

    // Hash the supplied token to match against token_hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const supabase = await createClient()

    // Query share by token_hash
    const { data: share, error: shareErr } = await supabase
      .from('shares')
      .select('id, file_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .single()

    if (shareErr || !share) {
      return NextResponse.json(
        { error: { message: 'Share link not found or invalid token.', status: 404 } },
        { status: 404 }
      )
    }

    // Check revocation
    if (share.revoked_at) {
      return NextResponse.json(
        {
          error: {
            message: 'This share link has been revoked by the file owner.',
            status: 410,
            code: 'SHARE_REVOKED',
          },
        },
        { status: 410 }
      )
    }

    // Check expiry
    const now = new Date()
    const expiresAt = new Date(share.expires_at)
    if (now > expiresAt) {
      return NextResponse.json(
        {
          error: {
            message: 'This share link has expired.',
            status: 410,
            code: 'SHARE_EXPIRED',
          },
        },
        { status: 410 }
      )
    }

    // Fetch file metadata
    const { data: file, error: fileErr } = await supabase
      .from('files')
      .select('id, name, storage_path, size_bytes, mime_type, checksum_sha256')
      .eq('id', share.file_id)
      .single()

    if (fileErr || !file) {
      return NextResponse.json(
        { error: { message: 'Associated file not found.', status: 404 } },
        { status: 404 }
      )
    }

    // Generate short-lived signed download URL (60 seconds)
    const { data: signedData, error: signError } = await supabase.storage
      .from('netshare-files')
      .createSignedUrl(file.storage_path, 60, {
        download: file.name,
      })

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: { message: 'Failed to generate temporary download URL.', status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        file: {
          id: file.id,
          name: file.name,
          size_bytes: file.size_bytes,
          mime_type: file.mime_type,
          checksum_sha256: file.checksum_sha256,
        },
        signedUrl: signedData.signedUrl,
        expiresAt: share.expires_at,
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
