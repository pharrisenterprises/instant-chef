// src/components/N8NGenerate.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ===== Types you already use on the page ===== */
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
  portionsPerDinner?: number;
  dinnersPerWeek?: number;
};
export type CookingPreferences = {
  cookingSkill: string;
  cookingTimePreference: string;
  equipment: string[];
};
export type DietaryProfile = {
  allergiesRestrictions: string[]; // or string
  dislikesAvoidList: string[];
  dietaryPrograms: string[];       // or string
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
  extra: {
    weeklyMood?: string;
    weeklyExtras?: string;
    weeklyOnHandText?: string;
    pantrySnapshot?: any[];
    barSnapshot?: any[];
    currentMenusCount?: number;
  };
};

type Props = {
  client: ClientPayload;
};

export default function N8NGenerate({ client }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';
  const callbackBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL || ''; // either works

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);

    // 1) Auth info
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const email =
      user?.email ||
      client?.basicInformation?.email ||
      '';

    // 2) Pull latest profile row (if you have one)
    let profileSnapshot: any = null;
    if (userId) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      profileSnapshot = profileRow ?? null;
    }

    // 3) Build JSON blobs that match your table
    const pantry = client?.extra?.pantrySnapshot ?? [];
    const bar = client?.extra?.barSnapshot ?? [];
    const weekly = {
      weeklyMood: client?.extra?.weeklyMood ?? '',
      weeklyExtras: client?.extra?.weeklyExtras ?? '',
      weeklyOnHandText: client?.extra?.weeklyOnHandText ?? '',
      currentMenusCount: client?.extra?.currentMenusCount ?? 0,
      pantrySnapshot: pantry,
      barSnapshot: bar,
    };

    const correlationId =
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`) as string;

    const callbackUrl = callbackBase
      ? `${callbackBase.replace(/\/+$/, '')}/api/n8n/callback`
      : '';

    // 4) Insert ONLY the columns that exist
    const insertRow = {
      user_id: userId,
      email,
      profile_snapshot: profileSnapshot, // jsonb
      weekly,                            // jsonb
      pantry,                            // jsonb
      bar,                               // jsonb
      menus: [],                         // jsonb (you can fill later)
      client_payload: client,            // jsonb
      status: 'submitted' as const,
      correlation_id: correlationId,
      callback_url: callbackUrl,
      n8n_webhook_url: n8nWebhookUrl,
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(insertRow)
      .select('id')
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // 5) Kick n8n with correlation + callback (optional)
    try {
      if (n8nWebhookUrl) {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client,
            correlationId,
            callbackUrl,
          }),
        });
      }
    } catch {
      // non-fatal; the order row is already inserted
    }

    setLoading(false);
    // You can toast instead of alert:
    alert('Cooking your menu…');
  }

  return (
    <button
      className="px-5 py-2 rounded bg-gray-800 text-white disabled:opacity-60"
      onClick={handleGenerate}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? 'Cooking your menu…' : 'Generate Menu'}
    </button>
  );
}
