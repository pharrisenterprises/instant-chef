'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';

function ChefCookingPortal({
  open,
  onClose,
  autoHideMs = 10000,
}: {
  open: boolean;
  onClose: () => void;
  autoHideMs?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  useEffect(() => { if (!open) return; const t = setTimeout(onClose, autoHideMs); return () => clearTimeout(t); }, [open, autoHideMs, onClose]);
  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
              <path d="M20 40h24v10a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V40z" fill="#e5e7eb" />
              <path d="M16 28h32v10H16z" fill="#111827" />
              <path d="M32 8c-5.3 0-9.6 3.7-10.7 8.6C18.3 17 16 19.6 16 22.8 16 26.8 19.2 30 23.2 30h17.6c4 0 7.2-3.2 7.2-7.2 0-3.2-2.3-5.8-5.3-6.2C41.6 11.7 37.3 8 32 8z" fill="#f3f4f6" />
            </svg>
          </div>
          <h3 className="text-center text-lg font-semibold text-neutral-900">The chef is cooking your menus…</h3>
          <p className="mt-2 text-center text-sm text-neutral-700">We’re mixing your preferences, pantry, and budget to build the perfect weekly plan.</p>
          <p className="mt-1 text-center text-xs text-neutral-500">This can take a minute or two. You can continue browsing while we cook!</p>
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
            <div className="animate-[ic_progress_1.6s_ease-in-out_infinite] h-1 w-1/3 rounded-full bg-neutral-900" />
          </div>
          <div className="mt-6 flex justify-center">
            <button onClick={onClose} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400">Hide window</button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes ic_progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(15%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>,
    document.body
  );
}

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export type BasicInformation = {
  firstName: string; lastName: string; email: string;
  accountAddress: { street: string; city: string; state: string; zipcode: string; };
};
export type HouseholdSetup = {
  adults: number; teens: number; children: number; toddlersInfants: number;
  portionsPerDinner?: number; dinnersPerWeek?: number;
};
export type CookingPreferences = { cookingSkill: string; cookingTimePreference: string; equipment: string[]; };
export type DietaryProfile = { allergiesRestrictions: string[]; dislikesAvoidList: string[]; dietaryPrograms: string[]; notes?: string; };
export type ShoppingPreferences = {
  storesNearMe: string[]; preferredGroceryStore: string;
  preferOrganic: 'Yes' | 'No' | 'No preference';
  preferNationalBrands: 'Yes' | 'No' | 'No preference';
};
export type ClientPayload = {
  basicInformation: BasicInformation; householdSetup: HouseholdSetup;
  cookingPreferences: CookingPreferences; dietaryProfile: DietaryProfile;
  shoppingPreferences: ShoppingPreferences;
  extra: {
    weeklyMood: string; weeklyExtras: string; weeklyOnHandText: string;
    pantrySnapshot: any[]; barSnapshot: any[]; currentMenusCount: number;
    budgetType?: 'per_week' | 'per_meal' | null; budgetValue?: number | null;
  };
};
export type WeeklyMinimal = {
  mood?: string | null; extras?: string | null; onHandText?: string | null;
  pantrySnapshot?: any[]; barSnapshot?: any[]; currentMenusCount?: number | null;
  budgetType?: 'per_week' | 'per_meal' | 'perWeek' | 'perMeal' | 'none' | string | null;
  budgetValue?: number | null;
};

// robust normalizer: accepts perWeek/perMeal, human text, underscores, etc.
function normalizeBudgetType(t?: string | null): 'per_week' | 'per_meal' | null {
  if (!t) return null;
  const s = t.toString().trim().toLowerCase();
  if (s === 'none' || s === '' || s === 'no budget') return null;
  const cleaned = s
    .replace(/\$/g, '')
    .replace(/\s+/g, '_'); // "per week" -> "per_week"
  if (cleaned === 'per_week' || cleaned === 'perweek' || cleaned === 'week' || cleaned === 'weekly') return 'per_week';
  if (cleaned === 'per_meal' || cleaned === 'permeal' || cleaned === 'meal' || cleaned === 'per_meal_$') return 'per_meal';
  // handle camelCase coming from UI values
  if (s === 'perweek') return 'per_week';
  if (s === 'permeal') return 'per_meal';
  return null;
}

export default function N8NGenerate({
  client,
  weekly,
}: {
  client: ClientPayload;
  weekly?: WeeklyMinimal;
}) {
  const [busy, setBusy] = useState(false);
  const [chefOpen, setChefOpen] = useState(false);
  const supabase = createClient();

  const strToArr = (s?: string | null) => {
    if (!s || s.trim().toLowerCase() === 'no') return [];
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  };
  const normalizeArray = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : strToArr(typeof v === 'string' ? v : '');
  const yesNo = (s?: string | null): 'Yes' | 'No' | 'No preference' => {
    const v = (s ?? '').toLowerCase(); if (v === 'yes') return 'Yes'; if (v === 'no') return 'No'; return 'No preference';
  };
  const natBrands = (s?: string | null): 'Yes' | 'No' | 'No preference' => {
    const v = (s ?? '').toLowerCase(); if (v === 'yes') return 'Yes'; if (v === 'no') return 'No'; return 'No preference';
  };

  async function onGenerate() {
    try {
      setBusy(true);
      setChefOpen(true); // show the popup immediately

      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = auth.user;
      if (!user) throw new Error('Please sign in again.');

      const { data: profile, error: pErr } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (pErr) throw pErr;

      const equipment: string[] = normalizeArray((profile as any)?.equipment);

      const basicInformation: BasicInformation = {
        firstName: (profile as any)?.first_name ?? '',
        lastName: (profile as any)?.last_name ?? '',
        email: (profile as any)?.email ?? user.email ?? '',
        accountAddress: {
          street: (profile as any)?.account_street ?? '',
          city: (profile as any)?.account_city ?? '',
          state: (profile as any)?.account_state ?? '',
          zipcode: (profile as any)?.account_zipcode ?? '',
        },
      };

      const householdSetup: HouseholdSetup = {
        adults: (profile as any)?.adults ?? 0,
        teens: (profile as any)?.teens ?? 0,
        children: (profile as any)?.children ?? 0,
        toddlersInfants: (profile as any)?.toddlers ?? 0,
        portionsPerDinner:
          (profile as any)?.portions_per_dinner ?? client.householdSetup?.portionsPerDinner ?? 1,
        dinnersPerWeek:
          (profile as any)?.dinners_per_week ?? client.householdSetup?.dinnersPerWeek ?? 3,
      };

      const cookingPreferences: CookingPreferences = {
        cookingSkill: (profile as any)?.cooking_skill ?? 'Beginner',
        cookingTimePreference: (profile as any)?.cooking_time ?? '30 min',
        equipment,
      };

      const dietaryProfile: DietaryProfile = {
        allergiesRestrictions: normalizeArray((profile as any)?.allergies),
        dislikesAvoidList: normalizeArray((profile as any)?.dislikes),
        dietaryPrograms: normalizeArray((profile as any)?.dietary_programs),
        notes: (profile as any)?.macros ?? undefined,
      };

      const shoppingPreferences: ShoppingPreferences = {
        storesNearMe: normalizeArray((profile as any)?.stores_near_me),
        preferredGroceryStore:
          (profile as any)?.preferred_store ||
          normalizeArray((profile as any)?.stores_near_me)[0] ||
          client.shoppingPreferences?.preferredGroceryStore ||
          '',
        preferOrganic: yesNo((profile as any)?.organic_preference),
        preferNationalBrands: natBrands((profile as any)?.brand_preference),
      };

      // pull weekly data from the prop and normalize budget fields
      const w = weekly ?? {};
      const budgetType = normalizeBudgetType(w.budgetType as any);
      const budgetValue =
        typeof w.budgetValue === 'number'
          ? w.budgetValue
          : (w.budgetValue as any) === '' || w.budgetValue == null
          ? null
          : Number(w.budgetValue);

      const extra = {
        weeklyMood: (w.mood ?? client.extra?.weeklyMood ?? '').toString(),
        weeklyExtras: (w.extras ?? client.extra?.weeklyExtras ?? '').toString(),
        weeklyOnHandText: (w.onHandText ?? client.extra?.weeklyOnHandText ?? '').toString(),
        pantrySnapshot: w.pantrySnapshot ?? client.extra?.pantrySnapshot ?? [],
        barSnapshot: w.barSnapshot ?? client.extra?.barSnapshot ?? [],
        currentMenusCount: w.currentMenusCount ?? client.extra?.currentMenusCount ?? 0,
        budgetType,                   // ✅ normalized to 'per_week' | 'per_meal' | null
        budgetValue: isNaN(budgetValue as any) ? null : (budgetValue as number | null), // ✅ number | null
      } as ClientPayload['extra'];

      const clientPayload: ClientPayload = {
        basicInformation, householdSetup, cookingPreferences, dietaryProfile, shoppingPreferences, extra,
      };

      const correlationId = makeId();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!;
      const callbackUrl = `${siteUrl}/api/n8n/callback`;

      const orderRow = {
        user_id: user.id,
        email: basicInformation.email,
        profile_snapshot: profile,
        weekly: extra,
        pantry: extra.pantrySnapshot,
        bar: extra.barSnapshot,
        menus: [],
        client_payload: clientPayload,
        status: 'submitted',
        correlation_id: correlationId,
        callback_url: callbackUrl,
        n8n_webhook_url: n8nUrl,
      };

      // 🔍 Debug: confirm budgets before we send
      console.log('[N8NGenerate] order.weekly ->', orderRow.weekly);

      const { data: inserted, error: insertErr } = await supabase
        .from('orders').insert(orderRow).select('*').single();
      if (insertErr) throw insertErr;

      if (n8nUrl) {
        await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: inserted }),
        });
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed: ${err?.message ?? String(err)}`);
    } finally {
      setBusy(false);
      // popup auto-hides on its own after 10s
    }
  }

  return (
    <>
      <button
        onClick={onGenerate}
        disabled={busy}
        className="px-5 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {busy ? 'Cooking your menu…' : 'Generate Menu'}
      </button>

      <ChefCookingPortal open={chefOpen} onClose={() => setChefOpen(false)} autoHideMs={10000} />
    </>
  );
}
