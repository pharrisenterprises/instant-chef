'use client';

import { useEffect, useRef, useState } from 'react';

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
  try {
    if (raw) data = JSON.parse(raw);
  } catch {
    // non-JSON body (e.g., empty) is fine; we'll handle below
  }

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
  const [status, setStatus] = useState<string>('idle');

  // polling state
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    pollTimer.current = null;
    timeoutTimer.current = null;
  }

  async function start() {
    setError(null);
    setResult(null);
    setCid(null);
    setStatus('triggering');
    setLoading(true);
    clearTimers();

    try {
      // Hit our API route which forwards to n8n webhook and returns a correlationId
      const r = await postJSON<{ correlationId: string; status: string }>(
        '/api/n8n/trigger',
        {
          client,
          // You can toggle these flags if needed later
          generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
        }
      );
      setCid(r.correlationId);
      setStatus('waiting');
      // polling & safety timeout
      beginPolling(r.correlationId);
    } catch (e: any) {
      setError(e?.message || 'Failed to trigger workflow');
      setStatus('error');
      setLoading(false);
    }
  }

  function cancel() {
    clearTimers();
    setStatus('cancelled');
    setLoading(false);
  }

  function beginPolling(correlationId: string) {
    // poll every 2s
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/n8n/callback?cid=${encodeURIComponent(correlationId)}`, {
          // prevent any caching weirdness on some CDNs
          cache: 'no-store',
        });

        // Empty / non-JSON is fine during "not ready yet"
        const txt = await res.text();
        let data: any = null;
        try {
          if (txt) data = JSON.parse(txt);
        } catch {
          data = null;
        }

        // We accept either a "done" status or a generic ok: true
        if (data && (data.status === 'done' || data.ok === true || data.result)) {
          setResult(data);
          setStatus('done');
          setLoading(false);
          clearTimers();
        }
      } catch {
        // ignore transient poll errors
      }
    }, 2000);

    // hard stop after 2 minutes
    timeoutTimer.current = setTimeout(() => {
      clearTimers();
      setLoading(false);
      setStatus('timeout');
      setError('Timed out waiting for n8n (2 minutes). Check your n8n workflow or callback URL.');
    }, 120000);
  }

  // cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  const canTrigger = !loading;

  return (
    <div className="mt-4 border rounded-xl p-4 bg-white">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          onClick={start}
          disabled={!canTrigger}
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
        >
          {loading ? 'Generating…' : 'Generate Menu'}
        </button>

        {loading && (
          <button
            onClick={cancel}
            className="px-3 py-2 rounded border bg-white text-gray-700"
          >
            Cancel
          </button>
        )}

        {cid && !result && (
          <span className="text-sm text-gray-600">
            {status === 'triggering' && 'Starting workflow…'}
            {status === 'waiting' && <>Waiting on n8n… (cid {cid.slice(0, 8)}…)</>}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!error && status === 'timeout' && (
        <div className="mt-3 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
          Timed out waiting for results. Verify your n8n workflow finishes and
          that the <code>/api/n8n/callback</code> URL in your n8n HTTP&nbsp;Request node
          points to this deployment.
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
