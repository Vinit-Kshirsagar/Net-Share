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
    const parentId = searchParams.get('parentId') // 'all', 'root', or uuid

    let dbQuery = supabase
      .from('folders')
      .select('*')
      .eq('owner_id', user.id)
      .order('name', { ascending: true })

    if (parentId === 'root' || (!parentId && parentId !== 'all')) {
      dbQuery = dbQuery.is('parent_folder_id', null)
    } else if (parentId && parentId !== 'all') {
      dbQuery = dbQuery.eq('parent_folder_id', parentId)
    }

    const { data: folders, error } = await dbQuery

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: folders ?? [] })
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
    const { name, parentFolderId } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return NextResponse.json(
        { error: { message: 'Folder name must be between 1 and 100 characters.', status: 400 } },
        { status: 400 }
      )
    }

    // Verify parentFolderId if provided
    if (parentFolderId && parentFolderId !== 'root') {
      const { data: parent, error: parentErr } = await supabase
        .from('folders')
        .select('id')
        .eq('id', parentFolderId)
        .eq('owner_id', user.id)
        .single()

      if (parentErr || !parent) {
        return NextResponse.json(
          { error: { message: 'Parent folder not found or not owned by user.', status: 400 } },
          { status: 400 }
        )
      }
    }

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        parent_folder_id: parentFolderId && parentFolderId !== 'root' ? parentFolderId : null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, status: 500 } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: folder }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 }
    )
  }
}
