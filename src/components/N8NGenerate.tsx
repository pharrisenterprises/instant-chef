'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// safe id generator
const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/* ===== Types (as you have) ===== */
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
  adults: number;
  teens: number;
  children: number;
  toddlersInfants: number;
  portionsPerDinner?: number;
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
  preferOrganic: 'Yes' | 'No' | 'I dont care';
  preferNationalBrands: 'Yes' | 'No' | 'No preference';
};

export type ClientPayload = {
  basicInformation: BasicInformation;
  householdSetup: HouseholdSetup;
  cookingPreferences: CookingPreferences;
  dietaryProfile: DietaryProfile;
  shoppingPreferences: ShoppingPreferences;
  extra: {
    weeklyMood: string;
    weeklyExtras: string;
    weeklyOnHandText: string;
    pantrySnapshot: any[];
    barSnapshot: any[];
    currentMenusCount: number;
    budgetType?: 'per_week' | 'per_meal' | null;
    budgetValue?: number | null;
  };
};

// Minimal Weekly shape this file needs
export type WeeklyMinimal = {
  mood?: string | null;
  extras?: string | null;
  onHandText?: string | null;
  pantrySnapshot?: any[];
  barSnapshot?: any[];
  currentMenusCount?: number | null;
  budgetType?: 'per_week' | 'per_meal' | null;
  budgetValue?: number | null;
};

/* ===== Component ===== */
export default function N8NGenerate({
  client,
  weekly, // ✅ pass weekly in from the page that renders this button
}: {
  client: ClientPayload;
  weekly: WeeklyMinimal;
}) {
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const strToArr = (s?: string | null) => {
    if (!s || s.trim().toLowerCase() === 'no') return [];
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  };
  const normalizeArray = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : strToArr(typeof v === 'string' ? v : '');

  const yesNo = (s?: string | null): 'Yes' | 'No' | 'I dont care' => {
    const v = (s ?? '').toLowerCase();
    if (v === 'yes') return 'Yes';
    if (v === 'no') return 'No';
    return 'I dont care';
  };
  const natBrands = (s?: string | null): 'Yes' | 'No' | 'No preference' => {
    const v = (s ?? '').toLowerCase();
    if (v === 'yes') return 'Yes';
    if (v === 'no') return 'No';
    return 'No preference';
  };

  const normalizeBudgetType = (t?: string | null): 'per_week' | 'per_meal' | null => {
    if (!t) return null;
    const s = t.toLowerCase();
    if (s === 'per_week' || s.includes('per week')) return 'per_week';
    if (s === 'per_meal' || s.includes('per meal')) return 'per_meal';
    return null;
  };

  async function onGenerate() {
    try {
      setBusy(true);

      // 1) auth
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = auth.user;
      if (!user) {
        alert('Please sign in again.');
        return;
      }

      // 2) profile
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (pErr) throw pErr;

      // 3) map profile
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

      // 4) weekly/extra (✅ prefer live weekly state; fallback to client.extra)
      const extra = {
        weeklyMood: weekly.mood ?? client.extra?.weeklyMood ?? '',
        weeklyExtras: weekly.extras ?? client.extra?.weeklyExtras ?? '',
        weeklyOnHandText: weekly.onHandText ?? client.extra?.weeklyOnHandText ?? '',
        pantrySnapshot: weekly.pantrySnapshot ?? client.extra?.pantrySnapshot ?? [],
        barSnapshot: weekly.barSnapshot ?? client.extra?.barSnapshot ?? [],
        currentMenusCount: weekly.currentMenusCount ?? client.extra?.currentMenusCount ?? 0,

        // ✅ budget
        budgetType: normalizeBudgetType(
          weekly.budgetType ?? client.extra?.budgetType ?? null
        ),
        budgetValue:
          weekly.budgetValue ?? client.extra?.budgetValue ?? null,
      } as ClientPayload['extra'];

      const clientPayload: ClientPayload = {
        basicInformation,
        householdSetup,
        cookingPreferences,
        dietaryProfile,
        shoppingPreferences,
        extra,
      };

      // 5) create order
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
        weekly: extra,                 // ✅ budget lands here
        pantry: extra.pantrySnapshot,
        bar: extra.barSnapshot,
        menus: [],
        client_payload: clientPayload, // ✅ and here
        status: 'submitted',
        correlation_id: correlationId,
        callback_url: callbackUrl,
        n8n_webhook_url: n8nUrl,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('orders')
        .insert(orderRow)
        .select('*')
        .single();
      if (insertErr) throw insertErr;

      // 6) Send to n8n
      if (n8nUrl) {
        await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: inserted }),
        });
      }

      alert('Order created and sent to n8n!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed: ${err?.message ?? String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onGenerate}
      disabled={busy}
      className="px-5 py-2 rounded bg-black text-white disabled:opacity-50"
    >
      {busy ? 'Cooking your menu…' : 'Generate Menu'}
    </button>
  );
}

