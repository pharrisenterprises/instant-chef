// Browser/client-side Supabase helper
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// IMPORTANT: named export `createClient`
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    // Fail fast with a clear message if env vars are missing in Vercel
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // RETURN the instance (the common mistake is forgetting this return)
  return createSupabaseClient<Database>(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}
