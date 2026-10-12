import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

/**
 * Next.js 16 proxy — replaces the deprecated middleware.ts file.
 * Named export must be `proxy` (not `middleware`).
 *
 * This runs before every matched request and refreshes the Supabase
 * Auth session so Server Components always have an up-to-date user.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
