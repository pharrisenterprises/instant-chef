'use client';

import { useState } from 'react';

type SnapshotItem = {
  id: string;
  name: string;
  qty: number | null;
  measure: string | null;
  type?: string;
  staple?: boolean;
  active?: boolean;
  perishable?: boolean;
  updatedAt?: number;
};

type WeeklyPlanner = {
  portionsPerDinner: number;
  groceryStore: string;
  dinnersNeededThisWeek: number;
  budgetType: 'Per week ($)' | 'Per meal ($)' | 'none' | string;
  budgetValue: number | '';
  weeklyOnHandText: string;
  weeklyMood: string;
  weeklyExtras: string;
};

export default function N8NGenerate({
  weeklyPlanner,
  pantrySnapshot,
  barSnapshot,
  currentMenusCount,
}: {
  weeklyPlanner: WeeklyPlanner;
  pantrySnapshot: SnapshotItem[];
  barSnapshot: SnapshotItem[];
  currentMenusCount: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);

    const correlationId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const payload = {
      weeklyPlanner,
      extra: {
        weeklyMood: weeklyPlanner.weeklyMood,
        weeklyExtras: weeklyPlanner.weeklyExtras,
        weeklyOnHandText: weeklyPlanner.weeklyOnHandText,
        pantrySnapshot,
        barSnapshot,
        currentMenusCount,
      },
      generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
      correlationId,
    };

    try {
      const res = await fetch('/api/n8n/trigger', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Try to read JSON either way for clearer messages
      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg =
          body?.error ??
          (res.status === 401
            ? 'Please log in to generate your menu.'
            : `Request failed (${res.status}).`);
        alert(msg);
        return;
      }

      alert('Got it! Generating your menu…');
    } catch (err: any) {
      console.error('Generate error', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button" // avoid implicit form submit
      className="rounded bg-emerald-600 text-white px-6 py-3 font-medium disabled:opacity-60"
      onClick={handleGenerate}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? 'Working…' : 'Generate Menu'}
    </button>
  );
}
