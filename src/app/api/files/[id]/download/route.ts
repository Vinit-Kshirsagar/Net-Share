import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    // Verify ownership
    const { data: file, error: findError } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single()

    if (findError || !file) {
      return NextResponse.json(
        { error: { message: 'File not found or access denied.', status: 404 } },
        { status: 404 }
      )
    }

    // Generate short-lived signed download URL (120 seconds expiry)
    const { data: signedData, error: signError } = await supabase.storage
      .from('netshare-files')
      .createSignedUrl(file.storage_path, 120, {
        download: file.name,
      })

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: { message: signError?.message || 'Failed to generate signed download URL.', status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        signedUrl: signedData.signedUrl,
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
