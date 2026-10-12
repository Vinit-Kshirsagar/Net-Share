import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database } from '@/types/database'

/**
 * Session refresh proxy handler.
 *
 * In Next.js 16, middleware is renamed to proxy (proxy.ts).
 * This function is called from src/proxy.ts to refresh Supabase Auth sessions
 * before server components and route handlers run.
 *
 * IMPORTANT: This uses the Node.js runtime (not edge), consistent with
 * Next.js 16's proxy.ts which does not support the edge runtime.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do NOT add logic between createServerClient and
  // getUser(). Any await between them risks missing cookie updates.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes
  const { pathname } = request.nextUrl
  const isProtectedRoute =
    pathname.startsWith('/files') ||
    pathname.startsWith('/network') ||
    pathname.startsWith('/protocols') ||
    pathname.startsWith('/lab') ||
    pathname.startsWith('/share-manage')

  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/register')

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/files'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
