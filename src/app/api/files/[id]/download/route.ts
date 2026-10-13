import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

// Signed URL lifetime: 10 minutes (600 seconds)
const SIGNED_URL_TTL_SECONDS = 600

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const requestId = uuidv4()

  try {
    const { id } = await context.params
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

    // Allow download if: user is the owner OR the file is marked public
    const { data: file, error: findError } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .or(`owner_id.eq.${user.id},is_public.eq.true`)
      .single()

    if (findError || !file) {
      return NextResponse.json(
        { error: { message: 'File not found or access denied.', status: 404 } },
        { status: 404 }
      )
    }

    // Generate 10-minute signed download URL
    const { data: signedData, error: signError } = await supabase.storage
      .from('netshare-files')
      .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS, {
        download: file.name,
      })

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: { message: signError?.message || 'Failed to generate signed download URL.', status: 500 } },
        { status: 500 }
      )
    }

    // Log download telemetry (only for non-owner public downloads, both are fine)
    await supabase.from('transfer_logs').insert({
      user_id: user.id,
      request_id: requestId,
      operation: 'download',
      status_code: 200,
      duration_ms: Date.now() - startTime,
      bytes_transferred: file.size_bytes,
      error_code: null,
    })

    return NextResponse.json({
      data: {
        signedUrl: signedData.signedUrl,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
        file,
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
