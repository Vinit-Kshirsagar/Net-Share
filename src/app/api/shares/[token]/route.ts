import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token: id } = await context.params
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

    // Revoke share by updating revoked_at to now()
    const { data: share, error } = await supabase
      .from('shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (error || !share) {
      return NextResponse.json(
        { error: { message: error?.message || 'Share not found or unauthorized.', status: 404 } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: { success: true, id, revokedAt: share.revoked_at } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}
