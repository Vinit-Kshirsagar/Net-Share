import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

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

    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single()

    if (error || !file) {
      return NextResponse.json(
        { error: { message: 'File not found or access denied.', status: 404 } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: file })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    // Check file exists and belongs to user
    const { data: existingFile, error: findError } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single()

    if (findError || !existingFile) {
      return NextResponse.json(
        { error: { message: 'File not found or access denied.', status: 404 } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updates: { name?: string; folder_id?: string | null } = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 255) {
        return NextResponse.json(
          { error: { message: 'Invalid file name length.', status: 400 } },
          { status: 400 }
        )
      }
      updates.name = body.name.trim()
    }

    if (body.folderId !== undefined) {
      if (body.folderId === null || body.folderId === 'root') {
        updates.folder_id = null
      } else {
        // Verify target folder belongs to user
        const { data: folder, error: folderErr } = await supabase
          .from('folders')
          .select('id')
          .eq('id', body.folderId)
          .eq('owner_id', user.id)
          .single()

        if (folderErr || !folder) {
          return NextResponse.json(
            { error: { message: 'Target folder not found or not owned by user.', status: 400 } },
            { status: 400 }
          )
        }
        updates.folder_id = body.folderId
      }
    }

    const { data: updatedFile, error: updateError } = await supabase
      .from('files')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: { message: updateError.message, status: 500 } },
        { status: 500 }
      )
    }

    // Log telemetry for rename
    await supabase.from('transfer_logs').insert({
      user_id: user.id,
      request_id: requestId,
      operation: 'rename',
      status_code: 200,
      duration_ms: Date.now() - startTime,
      bytes_transferred: 0,
      error_code: null,
    })

    return NextResponse.json({ data: updatedFile })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Get file to verify ownership and find storage path
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

    // 1. Delete object from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('netshare-files')
      .remove([file.storage_path])

    if (storageError) {
      // Partial failure warning logged
      console.warn('Warning: Storage removal error for path', file.storage_path, storageError)
    }

    // 2. Delete metadata row
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: { message: deleteError.message, status: 500 } },
        { status: 500 }
      )
    }

    // 3. Log delete telemetry
    await supabase.from('transfer_logs').insert({
      user_id: user.id,
      request_id: requestId,
      operation: 'delete',
      status_code: 200,
      duration_ms: Date.now() - startTime,
      bytes_transferred: file.size_bytes,
      error_code: null,
    })

    return NextResponse.json({ data: { success: true, id } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}
