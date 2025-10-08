'use client';

import { useState } from 'react';

/** ---------- TYPES (unchanged) ---------- */
export type BasicInformation = {
  firstName: string;
  lastName: string;
  email: string;
  accountAddress: { street: string; city: string; state: string; zipcode: string };
};
export type HouseholdSetup = {
  adults: number; teens: number; children: number; toddlersInfants: number;
  portionsPerDinner: number; dinnersPerWeek?: number;
};
export type CookingPreferences = {
  cookingSkill: string; cookingTimePreference: string; equipment: string[];
};
export type DietaryProfile = {
  allergiesRestrictions: string[]; dislikesAvoidList: string[]; dietaryPrograms: string[]; notes?: string;
};
export type ShoppingPreferences = {
  storesNearMe?: string[]; preferredGroceryStore?: string;
  preferOrganic?: string; preferNationalBrands?: string;
};

export type ClientPayload = {
  basicInformation?: Partial<BasicInformation>;
  householdSetup?: Partial<HouseholdSetup>;
  cookingPreferences?: Partial<CookingPreferences>;
  dietaryProfile?: Partial<DietaryProfile>;
  shoppingPreferences?: Partial<ShoppingPreferences>;
  extra?: Record<string, any>;
};

/** ---------- SMALL HELPERS ---------- */
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function splitList(v?: string) {
  return (v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/** Map Account Profile (saved at /account?edit=1) into our sections */
function buildFromAccountProfile() {
  // This matches the fields from your Account page (firstName, lastName, email, address, adults, teens, children, toddlers, portionsPerMeal, dinnersPerWeek, cookingSkill, cookingTime, equipment[], allergies, dislikes, dietaryPrograms, macros, storesNearby, preferredStore, organicPreference, brandPreference)
  const acct = readLS<any>('accountProfile', null);

  if (!acct) return {} as ClientPayload;

  const basicInformation: BasicInformation = {
    firstName: acct.firstName || '',
    lastName: acct.lastName || '',
    email: acct.email || '',
    accountAddress: {
      street: acct.address?.street || '',
      city: acct.address?.city || '',
      state: acct.address?.state || '',
      zipcode: acct.address?.zipcode || '',
    },
  };

  const householdSetup: HouseholdSetup = {
    adults: Number(acct.adults ?? 0),
    teens: Number(acct.teens ?? 0),
    children: Number(acct.children ?? 0),
    toddlersInfants: Number(acct.toddlers ?? 0),
    portionsPerDinner: Number(acct.portionsPerMeal ?? 0),
    dinnersPerWeek: Number(acct.dinnersPerWeek ?? 0),
  };

  const cookingPreferences: CookingPreferences = {
    cookingSkill: acct.cookingSkill || 'Beginner',
    cookingTimePreference: acct.cookingTime || '30 min',
    equipment: Array.isArray(acct.equipment) ? acct.equipment : splitList(acct.equipment),
  };

  const dietaryProfile: DietaryProfile = {
    allergiesRestrictions: splitList(acct.allergies),
    dislikesAvoidList: splitList(acct.dislikes),
    dietaryPrograms: splitList(acct.dietaryPrograms),
    notes: acct.macros || '',
  };

  const shoppingPreferences: ShoppingPreferences = {
    storesNearMe: splitList(acct.storesNearby),
    preferredGroceryStore: acct.preferredStore || '',
    preferOrganic: acct.organicPreference || 'I dont care',
    preferNationalBrands: acct.brandPreference || 'No preference',
  };

  return { basicInformation, householdSetup, cookingPreferences, dietaryProfile, shoppingPreferences } as ClientPayload;
}

/** shallow merge per section without nuking what's already supplied by caller */
function mergeClient(base: ClientPayload, enrich: ClientPayload): ClientPayload {
  const out: ClientPayload = { ...base };

  const apply = <K extends keyof ClientPayload>(k: K) => {
    const cur = (out[k] || {}) as any;
    const add = (enrich[k] || {}) as any;
    out[k] = { ...add, ...cur }; // caller values win; enrich fills blanks
  };

  apply('basicInformation');
  apply('householdSetup');
  apply('cookingPreferences');
  apply('dietaryProfile');
  apply('shoppingPreferences');

  // keep extra as-is from base; (enrich doesn't set it)
  return out;
}

async function startJob(client: ClientPayload) {
  const res = await fetch('/api/n8n/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client,
      generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to start job: ${txt || res.status}`);
  }
  const json = await res.json();
  return json.correlationId as string;
}

async function getResults(correlationId: string) {
  const res = await fetch(`/api/n8n/callback?cid=${encodeURIComponent(correlationId)}`, { cache: 'no-store' });
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** ---------- COMPONENT ---------- */
export default function N8NGenerate({ client }: { client: ClientPayload }) {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    try {
      setErr(null);
      setStatus('working');

      // 1) Enrich payload from Account Profile before sending
      const fromAccount = buildFromAccountProfile();
      const mergedClient = mergeClient(client || {}, fromAccount);

      // Minimal guard: require an email (names can be derived server-side if you add that later)
      if (!mergedClient.basicInformation?.email) {
        throw new Error('Please complete your Account Profile (first name, last name, email) and Save.');
      }

      // 2) trigger
      const cid = await startJob(mergedClient);

      // 3) poll up to ~3 minutes
      let last: any = null;
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const r = await getResults(cid);
        last = r;
        if (r && (r.status === 'done' || r.status === 'error')) break;
      }

      if (!last) throw new Error('No response received.');
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

      {status === 'done' && data?.status === 'done' && (
        <div className="space-y-8">
          {/* render your data.menus/menuCards/receipt like before */}
        </div>
      )}
    </div>
  );
}
