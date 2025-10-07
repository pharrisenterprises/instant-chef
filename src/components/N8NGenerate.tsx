'use client';

import { useEffect, useRef, useState } from 'react';

/* ---------- Types ---------- */
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

/** Weekly UI coming from your planner form */
export type WeeklyInputs = {
  portionsPerDinner?: number;
  groceryStore?: string;
  dinners?: number; // dinners needed this week
  budgetType?: 'none' | 'perWeek' | 'perMeal' | 'Per week ($)' | 'Per meal ($)'; // accept both forms
  budgetValue?: number | '';
  onHandText?: string;
  mood?: string;
  extras?: string;
};

export type PantryItem = Record<string, any>;
export type BarItem = Record<string, any>;

/* ---------- Utils ---------- */
async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: any = null;
  try { if (raw) data = JSON.parse(raw); } catch { /* ignore */ }

  if (!res.ok) {
    const msg = data?.error
      ? `${data.error}${data.details ? `: ${data.details}` : ''}`
      : `Request failed (${res.status}) ${raw?.slice(0, 200) || ''}`;
    throw new Error(msg);
  }
  if (data == null) throw new Error('Empty response from server');
  return data as T;
}

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function isBlank(x: unknown) {
  return x === undefined || x === null || (typeof x === 'string' && x.trim() === '');
}
function merge<A extends object, B extends object>(a: A, b: B): A & B {
  return { ...(a as any), ...(b as any) };
}
function normBudgetType(
  bt: WeeklyInputs['budgetType']
): 'none' | 'perWeek' | 'perMeal' {
  if (bt === 'Per week ($)') return 'perWeek';
  if (bt === 'Per meal ($)') return 'perMeal';
  return (bt as any) || 'none';
}

/* ---------- Component ---------- */
export default function N8NGenerate({
  client,
  weekly,
  pantrySnapshot,
  barSnapshot,
  currentMenusCount,
}: {
  client: ClientPayload;
  weekly?: WeeklyInputs;
  pantrySnapshot?: PantryItem[];
  barSnapshot?: BarItem[];
  currentMenusCount?: number;
}) {
  const [cid, setCid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<string>('idle');

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    pollTimer.current = null;
    timeoutTimer.current = null;
  }

  /** Build the final body sent to /api/n8n/trigger */
  function buildFinalBody() {
    // 1) Load stored profile blocks (fallbacks if missing)
    const lsBasic = readLS<BasicInformation>('ic_basic', {
      firstName: '',
      lastName: '',
      email: '',
      accountAddress: { street: '', city: '', state: '', zipcode: '' },
    });
    const lsHouse = readLS<HouseholdSetup>('ic_house', {
      adults: 0, teens: 0, children: 0, toddlersInfants: 0, portionsPerDinner: 4, dinnersPerWeek: undefined,
    });
    const lsCook = readLS<CookingPreferences>('ic_cook', {
      cookingSkill: 'Beginner', cookingTimePreference: '30 min', equipment: [],
    });
    const lsDiet = readLS<DietaryProfile>('ic_diet', {
      allergiesRestrictions: [], dislikesAvoidList: [], dietaryPrograms: [],
    });
    const lsShop = readLS<ShoppingPreferences>('ic_shop', {
      storesNearMe: [], preferredGroceryStore: '', preferOrganic: 'I dont care', preferNationalBrands: 'No preference',
    });

    // 2) Merge with props.client (props win over LS)
    const basicInformation = merge(lsBasic, client?.basicInformation || {});
    const householdSetup = merge(lsHouse, client?.householdSetup || {});
    const cookingPreferences = merge(lsCook, client?.cookingPreferences || {});
    const dietaryProfile = merge(lsDiet, client?.dietaryProfile || {});
    const shoppingPreferences = merge(lsShop, client?.shoppingPreferences || {});
    const extra = { ...(client?.extra || {}) };

    // 3) Fold Weekly UI
    const w = weekly || {};
    const portionsPerDinner =
      isBlank(householdSetup.portionsPerDinner) ? Number(w.portionsPerDinner ?? 4) : householdSetup.portionsPerDinner;
    const dinnersThisWeek =
      Number(isBlank(householdSetup.dinnersPerWeek) ? (w.dinners ?? 0) : householdSetup.dinnersPerWeek);

    const store =
      !isBlank(shoppingPreferences.preferredGroceryStore)
        ? shoppingPreferences.preferredGroceryStore
        : (w.groceryStore || '');

    const weeklyPlan = {
      dinnersThisWeek,
      portionsPerDinner: Number(portionsPerDinner ?? 4),
      groceryStore: store || '',
      budget: {
        type: normBudgetType(w.budgetType),
        value: isBlank(w.budgetValue) ? undefined : Number(w.budgetValue),
      },
      onHandCsv: (w.onHandText || '').trim(),
      mood: (w.mood || '').trim(),
      extras: (w.extras || '').trim(),
      ui: w, // helpful to inspect in n8n
    };

    // reflect back into profile parts
    const mergedHousehold: HouseholdSetup = {
      ...householdSetup,
      portionsPerDinner: weeklyPlan.portionsPerDinner,
      dinnersPerWeek: weeklyPlan.dinnersThisWeek,
    };
    const mergedShopping: ShoppingPreferences = {
      ...shoppingPreferences,
      preferredGroceryStore: weeklyPlan.groceryStore,
    };

    // keep legacy fields inside "extra" for backward compatibility
    extra.weeklyMood = weeklyPlan.mood;
    extra.weeklyExtras = weeklyPlan.extras;
    extra.weeklyOnHandText = weeklyPlan.onHandCsv;

    return {
      client: {
        basicInformation,
        householdSetup: mergedHousehold,
        cookingPreferences,
        dietaryProfile,
        shoppingPreferences: mergedShopping,
        extra,
      },
      weeklyPlan,
      pantrySnapshot: pantrySnapshot ?? [],
      barSnapshot: barSnapshot ?? [],
      currentMenusCount: Number(currentMenusCount ?? 0),
      generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
    };
  }

  async function start() {
    setError(null);
    setResult(null);
    setCid(null);
    setStatus('triggering');
    setLoading(true);
    clearTimers();

    try {
      const body = buildFinalBody();

      // trigger n8n (via your API route that adds correlationId/callbackUrl)
      const r = await postJSON<{ correlationId: string; status: string }>(
        '/api/n8n/trigger',
        body
      );

      setCid(r.correlationId);
      setStatus('waiting');
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
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/n8n/callback?cid=${encodeURIComponent(correlationId)}`, {
          cache: 'no-store',
        });

        const txt = await res.text();
        let data: any = null;
        try { if (txt) data = JSON.parse(txt); } catch { data = null; }

        if (data && (data.status === 'done' || data.ok === true || data.result)) {
          setResult(data);
          setStatus('done');
          setLoading(false);
          clearTimers();
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);

    timeoutTimer.current = setTimeout(() => {
      clearTimers();
      setLoading(false);
      setStatus('timeout');
      setError('Timed out waiting for n8n (2 minutes). Check your n8n workflow or callback URL.');
    }, 120000);
  }

  useEffect(() => () => clearTimers(), []);

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
