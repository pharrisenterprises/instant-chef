'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default function AuthPage() {
  // Wrap any useSearchParams usage in Suspense
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-gray-500">Loading…</div>}>
      <AuthInner />
    </Suspense>
  );
}

function AuthInner() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();
  const next = useSearchParams().get('next') || '/account';
  const supabase = useMemo(() => createClient(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) { setLoading(false); return setErr('Please check your email to confirm.'); }
      }
      await fetch('/api/mark-login', { method: 'POST' })
      router.push(next);
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={()=>setMode('login')}
            className={`flex-1 rounded-lg py-2 ${mode==='login'?'bg-black text-white':'bg-gray-100'}`}>
            Log in
          </button>
          <button onClick={()=>setMode('signup')}
            className={`flex-1 rounded-lg py-2 ${mode==='signup'?'bg-black text-white':'bg-gray-100'}`}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode==='signup' && (
            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input className="w-full rounded-lg border px-3 py-2" value={fullName}
                     onChange={(e)=>setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" className="w-full rounded-lg border px-3 py-2"
                   value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input type="password" className="w-full rounded-lg border px-3 py-2"
                   value={password} onChange={(e)=>setPassword(e.target.value)} required />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-emerald-600 text-white py-2 font-medium disabled:opacity-50">
            {loading ? 'Please wait…' : mode==='login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
