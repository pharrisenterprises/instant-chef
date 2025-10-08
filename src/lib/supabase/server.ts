// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient as _createServerClient, type CookieOptions } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Next's cookies API is write-only during the request lifecycle
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* no-op for Route Handlers */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            /* no-op */
          }
        },
      },
    }
  );
}
