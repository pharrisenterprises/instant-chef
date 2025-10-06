'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PostAuth() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      // 1) Must be logged in
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        console.error('auth.getUser error:', userErr);
      }
      if (!user) {
        router.replace('/auth?next=/post-auth');
        return;
      }

      // 2) Ensure a profiles row exists for this user (in case trigger didn't run)
      const upsertRes = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, email: user.email ?? null },
          { onConflict: 'id' } // PostgREST option
        )
        .select('id') // avoid returning full row
        .single();

      if (upsertRes.error) {
        console.error('profiles upsert error:', {
          message: upsertRes.error.message,
          details: upsertRes.error.details,
          hint: upsertRes.error.hint,
          code: (upsertRes.error as any).code,
        });
        // Graceful default: let the user continue
      }

      // 3) Read onboarding flag
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('profiles read error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: (error as any).code,
        });
        // Safe default if read fails: go to dashboard so user isn't stuck
        router.replace('/dashboard');
        return;
      }

      // 4) Decide where to go
      if (!profile || !profile.onboarding_completed) {
        router.replace('/account'); // first-time: setup wizard
      } else {
        const next = search.get('next');
        router.replace(next && next.startsWith('/') ? next : '/dashboard');
      }
    })();
  }, [router, search, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-500">Checking your account…</p>
    </div>
  );
}
