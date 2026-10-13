import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized. Please sign in.', status: 401 } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId') // 'root', null, or uuid
    const query = searchParams.get('q')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? true : false
    const scope = searchParams.get('scope') || 'all' // 'all', 'mine', or 'public'

    let dbQuery = supabase.from('files').select('*')

    if (scope === 'public') {
      // Query all files marked as public across all users
      dbQuery = dbQuery.eq('is_public', true)
    } else if (scope === 'mine') {
      // Query only the current user's files
      dbQuery = dbQuery.eq('owner_id', user.id)
      if (folderId === 'root' || !folderId) {
        dbQuery = dbQuery.is('folder_id', null)
      } else {
        dbQuery = dbQuery.eq('folder_id', folderId)
      }
    } else {
      // Default: 'all'
      // If at root level, show user's root files OR any publicly shared files
      if (folderId === 'root' || !folderId) {
        dbQuery = dbQuery.or(`and(owner_id.eq.${user.id},folder_id.is.null),is_public.eq.true`)
      } else {
        // Inside a specific folder, show that folder's contents
        dbQuery = dbQuery.eq('owner_id', user.id).eq('folder_id', folderId)
      }
    }

    // Name search
    if (query) {
      dbQuery = dbQuery.ilike('name', `%${query}%`)
    }

    // Sorting
    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder })

    const { data: files, error } = await dbQuery

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: files ?? [], currentUserId: user.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const requestId = uuidv4()

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
    const { name, storagePath, mimeType, sizeBytes, checksumSha256, folderId, durationMs } = body

    // Validation
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 255) {
      return NextResponse.json(
        { error: { message: 'Invalid file name (1-255 characters required).', status: 400 } },
        { status: 400 }
      )
    }

    if (!storagePath || typeof storagePath !== 'string' || !storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { error: { message: 'Forbidden storage path namespace violation.', status: 403 } },
        { status: 403 }
      )
    }

    if (typeof sizeBytes !== 'number' || sizeBytes < 0) {
      return NextResponse.json(
        { error: { message: 'Invalid sizeBytes parameter.', status: 400 } },
        { status: 400 }
      )
    }

    if (checksumSha256 && !/^[a-f0-9]{64}$/i.test(checksumSha256)) {
      return NextResponse.json(
        { error: { message: 'Invalid SHA-256 checksum format (must be 64 hex characters).', status: 400 } },
        { status: 400 }
      )
    }

    // Verify folder ownership if folderId provided
    if (folderId) {
      const { data: folder, error: folderErr } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folderId)
        .eq('owner_id', user.id)
        .single()

      if (folderErr || !folder) {
        return NextResponse.json(
          { error: { message: 'Specified folder not found or not owned by user.', status: 400 } },
          { status: 400 }
        )
      }
    }

    // Insert file metadata
    const { data: file, error: insertError } = await supabase
      .from('files')
      .insert({
        owner_id: user.id,
        folder_id: folderId || null,
        name: name.trim(),
        storage_path: storagePath,
        mime_type: mimeType || null,
        size_bytes: sizeBytes,
        checksum_sha256: checksumSha256 ? checksumSha256.toLowerCase() : null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: { message: insertError.message, status: 500 } },
        { status: 500 }
      )
    }

    // Record upload telemetry log
    const opDuration = typeof durationMs === 'number' ? durationMs : Date.now() - startTime
    await supabase.from('transfer_logs').insert({
      user_id: user.id,
      request_id: requestId,
      operation: 'upload',
      status_code: 201,
      duration_ms: opDuration,
      bytes_transferred: sizeBytes,
      error_code: null,
    })

    return NextResponse.json({ data: file }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}
