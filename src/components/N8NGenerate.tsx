'use client';

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
  budgetValue: number | ''; // allow blank
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
  async function handleGenerate(sample = false) {
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
      generate: { menus: true, heroImages: !sample, menuCards: true, receipt: true },
      correlationId,
    };

    const res = await fetch('/api/n8n/trigger', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Could not start workflow: ${j.error ?? 'Request failed'}`);
      return;
    }

    alert('Got it! Generating your menu…');
  }

  return (
    <div className="flex gap-3">
      <button
        className="rounded bg-emerald-600 text-white px-6 py-3"
        onClick={() => handleGenerate(true)}
      >
        Generate Menu (Sample)
      </button>
      <button
        className="rounded border px-6 py-3"
        onClick={() => handleGenerate(false)}
      >
        Generate Menu
      </button>
    </div>
  );
}
