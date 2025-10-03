'use client';

import { useState } from 'react';

/** ---------- TYPES: mirror your wizard ---------- */
export type BasicInformation = {
  firstName: string;
  lastName: string;
  email: string;
  accountAddress: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
  };
};

export type HouseholdSetup = {
  adults: number;            // 18+
  teens: number;             // 13–17
  children: number;          // 5–12
  toddlersInfants: number;   // 0–4
  portionsPerDinner: number; // e.g. 4
  dinnersPerWeek?: number;   // optional if you add later
};

export type CookingPreferences = {
  cookingSkill: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  cookingTimePreference: string; // e.g. "30 min"
  equipment: string[];           // e.g. ["Air fryer","Instant Pot",...]
};

export type DietaryProfile = {
  allergiesRestrictions: string[]; // e.g. ["Dairy","Peanuts"]
  dislikesAvoidList: string[];     // e.g. ["Mushrooms"]
  dietaryPrograms: string[];       // e.g. ["Keto","Diabetic"]
  notes?: string;                   // free text disclaimer/notes if you keep it
};

export type ShoppingPreferences = {
  storesNearMe?: string[];           // list if you capture multiple
  preferredGroceryStore?: string;    // single favorite
  preferOrganic?: 'I dont care' | 'Yes' | 'No' | string;
  preferNationalBrands?: 'Yes' | 'No' | 'No preference' | string;
};

export type ClientPayload = {
  basicInformation: BasicInformation;
  householdSetup: HouseholdSetup;
  cookingPreferences: CookingPreferences;
  dietaryProfile: DietaryProfile;
  shoppingPreferences: ShoppingPreferences;

  /** for anything you add later without changing this file */
  extra?: Record<string, any>;
};

/** ---------- RESULT TYPES (from n8n) ---------- */
type MenuDay = { day: number; meals: { name: string; ingredients: string[]; instructions?: string }[] };
type Menu = { title: string; days: MenuDay[] };
type MenuCard = { name: string; imageUrl: string; prepTime?: number; calories?: number };
type HeroImage = { type: string; imageUrl: string };
type Receipt = { ingredients: { name: string; qty: string }[]; estimatedTotal: number; currency: string };

type Results = {
  status: 'pending' | 'done' | 'error';
  correlationId?: string;
  menus?: Menu[];
  menuCards?: MenuCard[];
  heroImages?: HeroImage[];
  receipt?: Receipt;
  error?: string;
};

/** ---------- HELPERS ---------- */
async function startJob(client: ClientPayload) {
  const res = await fetch('/api/n8n/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client, // send everything under client
      generate: { menus: true, heroImages: true, menuCards: true, receipt: true }
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    throw new Error(`Failed to start job: ${txt || res.status}`);
  }
  const json = await res.json();
  return json.correlationId as string;
}

async function getResults(correlationId: string) {
  const res = await fetch(`/api/n8n/callback?cid=${encodeURIComponent(correlationId)}`, { cache: 'no-store' });
  const data = await res.json();
  return data as Results;
}

/** ---------- COMPONENT ---------- */
export default function N8NGenerate({ client }: { client: ClientPayload }) {
  const [status, setStatus] = useState<'idle'|'working'|'done'|'error'>('idle');
  const [data, setData] = useState<Results | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    try {
      setErr(null);
      setStatus('working');

      // 1) tell server to kick off n8n
      const cid = await startJob(client);

      // 2) poll for results
      let last: Results | null = null;
      // simple backoff: 2s x 90 ~ 3 minutes; adjust as you like
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const r = await getResults(cid);
        last = r;
        if (r.status === 'done' || r.status === 'error') break;
      }

      if (!last) throw new Error('No response received');
      setData(last);
      setStatus(last.status === 'done' ? 'done' : 'error');
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={run}
        className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-50"
        disabled={status === 'working'}
      >
        {status === 'working' ? 'Cooking your menu…' : 'Generate Menu'}
      </button>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* Results */}
      {status === 'done' && data?.status === 'done' && (
        <div className="space-y-8">
          {/* Hero images */}
          {data.heroImages?.length ? (
            <section>
              <h3 className="text-xl font-semibold mb-2">Hero Images</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.heroImages.map((img, i) => (
                  <img key={i} src={img.imageUrl} alt={img.type || `hero-${i}`} className="w-full h-48 object-cover rounded-xl border" />
                ))}
              </div>
            </section>
          ) : null}

          {/* Menus */}
          {data.menus?.length ? (
            <section>
              <h3 className="text-xl font-semibold mb-2">Weekly Menus</h3>
              <div className="space-y-4">
                {data.menus.map((menu, i) => (
                  <div key={i} className="rounded-xl border p-4">
                    <h4 className="font-semibold mb-2">{menu.title}</h4>
                    <div className="space-y-2">
                      {menu.days.map(day => (
                        <div key={day.day} className="pl-2">
                          <div className="font-medium">Day {day.day}</div>
                          <ul className="list-disc pl-6">
                            {day.meals.map((m, j) => (
                              <li key={j}>
                                <span className="font-medium">{m.name}</span>
                                {m.ingredients?.length ? (
                                  <span className="block text-sm text-gray-600">
                                    Ingredients: {m.ingredients.join(', ')}
                                  </span>
                                ) : null}
                                {m.instructions ? (
                                  <span className="block text-sm text-gray-600">How: {m.instructions}</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Menu cards */}
          {data.menuCards?.length ? (
            <section>
              <h3 className="text-xl font-semibold mb-2">Menu Cards</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.menuCards.map((c, i) => (
                  <div key={i} className="rounded-xl border overflow-hidden">
                    <img src={c.imageUrl} alt={c.name} className="w-full h-40 object-cover" />
                    <div className="p-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-gray-600">
                        {c.prepTime ? `Prep: ${c.prepTime} min` : ''}{c.prepTime && c.calories ? ' · ' : ''}{c.calories ? `${c.calories} cal` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Receipt */}
          {data.receipt ? (
            <section>
              <h3 className="text-xl font-semibold mb-2">Shopping List</h3>
              <div className="rounded-xl border p-4 space-y-2">
                <ul className="list-disc pl-6">
                  {data.receipt.ingredients.map((it, i) => (
                    <li key={i}>{it.name} — {it.qty}</li>
                  ))}
                </ul>
                <div className="font-medium">
                  Estimated Total: {data.receipt.estimatedTotal} {data.receipt.currency}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
