// src/lib/supabase/client.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const createClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,       // set in Vercel
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!   // set in Vercel
  );
