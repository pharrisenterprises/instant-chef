'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setNotice(null);

    if (!password || password.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setNotice('Password updated. Redirecting…');
      // Re-mark login window for 24h, then go to account
      await fetch('/api/mark-login', { method: 'POST' });
      router.replace('/account');
    } catch (e: any) {
      setErr(e.message ?? 'Could not update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 px-4">
      <form onSubmit={handleUpdate} className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <div>
          <label className="block text-sm mb-1">New password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Confirm password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={confirm}
            onChange={(e)=>setConfirm(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 text-white py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </main>
  );
}
