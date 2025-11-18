'use client';

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Always returns a valid browser Supabase client or throws with a clear message.
 * Exported as a *named* function: createClient()
 */
export function createClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // This prevents the cryptic "reading 'auth'" error.
    throw new Error(
      'Supabase is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  cached = createSupabaseClient(url, anon);
  return cached;
}
