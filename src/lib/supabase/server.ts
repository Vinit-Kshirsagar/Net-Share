import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type Database } from '@/types/database'

/**
 * Server-side Supabase client for use in:
 * - Server Components
 * - Route Handlers (src/app/api/...)
 * - Server Actions
 *
 * Always awaits cookies() as required by Next.js 16 async Request APIs.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — cookies cannot be set.
            // Safe to ignore; the proxy (middleware) handles session refreshing.
          }
        },
      },
    }
  )
}
