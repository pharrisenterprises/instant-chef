// src/lib/supabase/server.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const createServerClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // NEVER expose to client code
  );
