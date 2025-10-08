'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

const makeId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
// const correlationId = uuidv4();
const correlationId = makeId();


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
  };
};

// === Props shape you already pass from Dashboard ===
export default function N8NGenerate({ client }: { client: ClientPayload }) {
  const [busy, setBusy] = useState(false);

  async function onGenerate() {
    try {
      setBusy(true);

      // 1) who’s logged in?
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        alert('Please sign in again.');
        return;
      }

      // 2) load the profile row
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (pErr) throw pErr;

      // 3) robust helpers for mapping
      const strToArr = (s?: string | null) => {
        if (!s || s.trim().toLowerCase() === 'no') return [];
        return s.split(',').map(x => x.trim()).filter(Boolean);
      };

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

      // equipment may be stored as an array OR as booleans — support both
      const equipment: string[] = Array.isArray(profile?.equipment)
        ? profile.equipment
        : [
            profile?.equip_air_fryer && 'Air fryer',
            profile?.equip_instant_pot && 'Instant Pot',
            profile?.equip_slow_cooker && 'Slow Cooker',
            profile?.equip_sous_vide && 'Sous Vide',
            profile?.equip_cast_iron && 'Cast Iron',
            profile?.equip_smoker && 'Smoker',
            profile?.equip_stick_blender && 'Stick Blender',
            profile?.equip_cuisinart && 'Cuisinart',
            profile?.equip_kitchen_aid && 'Kitchen Aid',
            profile?.equip_vitamix_or_high_speed_blender && 'Vitamix or High Speed Blender (Ninja)',
            profile?.equip_fryer && 'Fryer',
          ].filter(Boolean) as string[];

      const basicInformation: BasicInformation = {
        firstName: profile?.first_name ?? '',
        lastName: profile?.last_name ?? '',
        email: profile?.email ?? user.email ?? '',
        accountAddress: {
          street: profile?.account_street ?? '',
          city: profile?.account_city ?? '',
          state: profile?.account_state ?? '',
          zipcode: profile?.account_zipcode ?? '',
        },
      };

      const householdSetup: HouseholdSetup = {
        adults: profile?.adults ?? 0,
        teens: profile?.teens ?? 0,
        children: profile?.children ?? 0,
        toddlersInfants: profile?.toddlers ?? 0,
        portionsPerDinner: profile?.portions_per_dinner ?? client.householdSetup?.portionsPerDinner ?? 1,
        dinnersPerWeek: profile?.dinners_per_week ?? client.householdSetup?.dinnersPerWeek ?? 3,
      };

      const cookingPreferences: CookingPreferences = {
        cookingSkill: profile?.cooking_skill ?? 'Beginner',
        cookingTimePreference: profile?.cooking_time ?? '30 min',
        equipment,
      };

      const dietaryProfile: DietaryProfile = {
        allergiesRestrictions: strToArr(profile?.allergies),
        dislikesAvoidList: strToArr(profile?.dislikes),
        dietaryPrograms: strToArr(profile?.dietary_programs),
        notes: profile?.macros ?? undefined,
      };

      const shoppingPreferences: ShoppingPreferences = {
        storesNearMe: strToArr(profile?.stores_near_me),
        preferredGroceryStore:
          profile?.preferred_store ??
          (strToArr(profile?.stores_near_me)[0] ?? client.shoppingPreferences?.preferredGroceryStore ?? ''),
        preferOrganic: yesNo(profile?.organic_preference),
        preferNationalBrands: natBrands(profile?.brand_preference),
      };

      // Keep all your Weekly/Bar/Pantry context coming from the page state
      const extra = {
        weeklyMood: client.extra?.weeklyMood ?? '',
        weeklyExtras: client.extra?.weeklyExtras ?? '',
        weeklyOnHandText: client.extra?.weeklyOnHandText ?? '',
        pantrySnapshot: client.extra?.pantrySnapshot ?? [],
        barSnapshot: client.extra?.barSnapshot ?? [],
        currentMenusCount: client.extra?.currentMenusCount ?? 0,
      };

      // Final payload sent to n8n
      const payload: ClientPayload = {
        basicInformation,
        householdSetup,
        cookingPreferences,
        dietaryProfile,
        shoppingPreferences,
        extra,
      };

      // 4) insert order row
      const correlationId = uuidv4();
      const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/n8n/callback`;
      const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!;

      const orderRow = {
        user_id: user.id,
        email: basicInformation.email,
        profile_snapshot: profile,        // full profile row for traceability
        weekly: extra,                    // weekly settings
        pantry: extra.pantrySnapshot,
        bar: extra.barSnapshot,
        menus: [],                        // you can fill after approvals, if you like
        client_payload: payload,          // exact payload we send to n8n
        status: 'submitted',
        correlation_id: correlationId,
        callback_url: callbackUrl,
        n8n_webhook_url: n8nUrl,
      };

      const { error: oErr } = await supabase.from('orders').insert(orderRow);
      if (oErr) throw oErr;

      // 5) POST to n8n
      await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: payload,
          correlationId,
          callbackUrl,
        }),
      });

      alert('Order created and sent to n8n!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed: ${err.message ?? String(err)}`);
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
