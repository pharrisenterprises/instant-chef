'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/auth?next=/post-auth');
      else setEmail(user.email);
    });
  }, [router, supabase]);

  async function completeSetup() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth?next=/post-auth');

    // Try to mark profile as onboarded (works once you create the table)
    try {
      await supabase.from('profiles').upsert(
        { id: user.id, onboarded: true },
        { onConflict: 'id' }
      );
    } catch {
      // ignore – still move to dashboard
    }

    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Account Setup Wizard</h1>
        <p className="text-gray-600">{email ? `Signed in as ${email}` : 'Loading…'}</p>

        {/* Replace this with your real wizard UI */}
        <div className="rounded-lg border p-4">
          <p className="text-gray-700">
            Put your setup steps here (address, preferences, etc.). Click finish when done.
          </p>
        </div>

        <button
          onClick={completeSetup}
          disabled={saving}
          className="rounded-lg bg-emerald-600 text-white px-5 py-2 font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Finish Setup'}
        </button>
      </div>
    </div>
  );
}
