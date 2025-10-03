'use client';

import { useEffect, useState } from 'react';

/* ---------- Types you can reuse elsewhere ---------- */
export type BasicInformation = {
  firstName: string;
  lastName: string;
  email: string;
  accountAddress: { street: string; city: string; state: string; zipcode: string };
};

export type HouseholdSetup = {
  adults: number;
  teens: number;
  children: number;
  toddlersInfants: number;
  portionsPerDinner: number;
  dinnersPerWeek?: number;
};

export type CookingPreferences = {
  cookingSkill: string;
  cookingTimePreference: string;
  equipment: string[];
};

export type DietaryProfile = {
  allergiesRestrictions: string[];
  dislikesAvoidList: string[];
  dietaryPrograms: string[];
  notes?: string;
};

export type ShoppingPreferences = {
  storesNearMe: string[];
  preferredGroceryStore: string;
  preferOrganic: string;
  preferNationalBrands: string;
};

export type ClientPayload = {
  basicInformation: BasicInformation;
  householdSetup: HouseholdSetup;
  cookingPreferences: CookingPreferences;
  dietaryProfile: DietaryProfile;
  shoppingPreferences: ShoppingPreferences;
  extra?: Record<string, any>;
};

/* ---------- Safe JSON poster (handles empty / non-JSON bodies) ---------- */
async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.text(); // read once
  let data: any = null;
  try { if (raw) data = JSON.parse(raw); } catch {}

  if (!res.ok) {
    const msg = data?.error
      ? `${data.error}${data.details ? `: ${data.details}` : ''}`
      : `Request failed (${res.status}) ${raw?.slice(0, 200) || ''}`;
    throw new Error(msg);
  }
  if (data == null) throw new Error('Empty response from server');
  return data as T;
}

/* ---------- Component ---------- */
export default function N8NGenerate({ client }: { client: ClientPayload }) {
  const [cid, setCid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function start() {
    setError(null);
    setResult(null);
    setCid(null);
    setLoading(true);

    try {
      const r = await postJSON<{ correlationId: string; status: string }>(
        '/api/n8n/trigger',
        {
          client,
          generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
        }
      );
      setCid(r.correlationId);
    } catch (e: any) {
      setError(e?.message || 'Failed to trigger workflow');
      setLoading(false);
    }
  }

  // Poll the callback store for results
  useEffect(() => {
    if (!cid) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/n8n/callback?cid=${encodeURIComponent(cid)}`);
        const data = await res.json().catch(() => null);
        if (data && (data.status === 'done' || data.ok === true)) {
          setResult(data);
          setLoading(false);
          clearInterval(iv);
        }
      } catch {
        /* ignore one-off poll errors */
      }
    }, 2000);

    return () => clearInterval(iv);
  }, [cid]);

  return (
    <div className="mt-4 border rounded-xl p-4 bg-white">
      <div className="flex items-center gap-3">
        <button
          onClick={start}
          disabled={loading}
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
        >
          {loading ? 'Generating…' : 'Generate Menu'}
        </button>
        {cid && !result && (
          <span className="text-sm text-gray-600">Waiting on n8n… (cid {cid.slice(0, 8)}…)</span>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="font-semibold">Results</div>
          <pre className="mt-2 p-3 bg-gray-50 rounded overflow-auto text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
