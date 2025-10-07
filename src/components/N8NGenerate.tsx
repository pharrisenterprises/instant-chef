'use client';

type SnapshotItem = {
  id: string
  name: string
  qty: number | null
  measure: string | null
  type?: string
  staple?: boolean
  active?: boolean
  perishable?: boolean
  updatedAt?: number
}

export default function N8NGenerate({
  weeklyMood,
  weeklyExtras,
  weeklyOnHandText,
  pantrySnapshot,
  barSnapshot,
  currentMenusCount,
}: {
  weeklyMood: string
  weeklyExtras: string
  weeklyOnHandText: string
  pantrySnapshot: SnapshotItem[]
  barSnapshot: SnapshotItem[]
  currentMenusCount: number
}) {
  async function handleGenerate(sample = false) {
    const payload = {
      extra: {
        weeklyMood,
        weeklyExtras,
        weeklyOnHandText,
        pantrySnapshot,
        barSnapshot,
        currentMenusCount,
      },
      generate: {
        menus: true,
        heroImages: !sample, // sample could skip heavy images if you want
        menuCards: true,
        receipt: true,
      },
      correlationId: crypto.randomUUID(),
    }

    const res = await fetch('/api/n8n/trigger', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(`Could not start workflow: ${j.error ?? 'Request failed'}`)
      return
    }

    alert('Got it! Generating your menu…')
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
  )
}
