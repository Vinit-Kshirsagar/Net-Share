import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// This page reads cookies at request time — opt out of prerendering.
export const instant = false

/**
 * Root page — redirect based on auth state.
 * Authenticated users → /files (file manager)
 * Unauthenticated users → /login
 */
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/files')
  } else {
    redirect('/login')
  }
}
