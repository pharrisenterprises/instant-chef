'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/* -------------------- Types (exported so page.tsx can import) -------------------- */
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
  cookingSkill: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  cookingTimePreference: string; // e.g. "30 min"
  equipment: string[];          // e.g. ["Air fryer", "Cast Iron", ...]
};

export type DietaryProfile = {
  allergiesRestrictions: string[]; // or free text, your UI collects a textarea
  dislikesAvoidList: string[];
  dietaryPrograms: string[];
  notes?: string;
};

export type ShoppingPreferences = {
  storesNearMe: string[];
  preferredGroceryStore: string;
  preferOrganic: string;          // "Yes" | "No" | "I dont care"
  preferNationalBrands: string;   // "Yes" | "No" | "No preference"
};

export type ClientPayload = {
  basicInformation: BasicInformation;
  householdSetup: HouseholdSetup;
  cookingPreferences: CookingPreferences;
  dietaryProfile: DietaryProfile;
  shoppingPreferences: ShoppingPreferences;
  extra?: {
    weeklyMood?: string;
    weeklyExtras?: string;
    weeklyOnHandText?: string;
    pantrySnapshot?: any[];
    barSnapshot?: any[];
    currentMenusCount?: number;
    // if you pass more weekly fields, they’ll be kept here:
    [k: string]: any;
  };
};

type Props = {
  /** The full client payload you already build on the dashboard page */
  client: ClientPayload;

  /** Optional: override webhook/callback; otherwise we use env + window origin */
  webhookUrl?: string;
  callbackUrl?: string;

  /** Called after successful submit (optional) */
  onSubmitted?: (args: { orderId: string; correlationId: string }) => void;
};

/* -------------------- Component -------------------- */
export default function N8NGenerate({
  client,
  webhookUrl,
  callbackUrl,
  onSubmitted,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  // helpers
  const hasEquip = (label: string) =>
    (client?.cookingPreferences?.equipment || []).includes(label);

  const effectiveWebhook =
    webhookUrl ||
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
    ''; // if blank, we’ll skip the POST but still insert

  const effectiveCallback =
    callbackUrl ||
    `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || ''}/api/n8n/callback`;

  async function handleClick() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1) who is the user?
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user || null;

      // 2) try to load a profile row (by email is safest for your current schema)
      let profileRow: any = null;
      if (user?.email) {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        profileRow = p ?? null;
      }

      // 3) compose explicit columns (Account Profile fields) + snapshots
      const correlationId = crypto.randomUUID();

      const orderRecord: any = {
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        correlation_id: correlationId,
        callback_url: effectiveCallback,
        n8n_webhook_url: effectiveWebhook,

        // JSON blobs (keep everything)
        profile_snapshot: profileRow,
        weekly: {
          mood: client?.extra?.weeklyMood ?? null,
          extras: client?.extra?.weeklyExtras ?? null,
          onHandText: client?.extra?.weeklyOnHandText ?? null,
          // include anything else you put under `extra.*` on the dashboard:
          ...client?.extra,
        },
        pantry: client?.extra?.pantrySnapshot ?? [],
        bar: client?.extra?.barSnapshot ?? [],
        menus: [], // you can update later when menus are generated
        client_payload: client,

        // ----- Explicit columns you asked to have on orders -----

        // Basic
        profile_first_name: client.basicInformation.firstName || profileRow?.first_name || null,
        profile_last_name: client.basicInformation.lastName || profileRow?.last_name || null,
        profile_email: client.basicInformation.email || user?.email || null,

        // Address
        address_street: client.basicInformation.accountAddress.street || null,
        address_city: client.basicInformation.accountAddress.city || null,
        address_state: client.basicInformation.accountAddress.state || null,
        address_zipcode: client.basicInformation.accountAddress.zipcode || null,
        delivery_same_as_account: true, // your UI checkbox – set true/false when you capture it

        // Household / portions / dinners
        adults: client.householdSetup.adults ?? 0,
        teens: client.householdSetup.teens ?? 0,
        children: client.householdSetup.children ?? 0,
        toddlers_infants: client.householdSetup.toddlersInfants ?? 0,
        portions_per_dinner: client.householdSetup.portionsPerDinner ?? null,
        dinners_per_week: client.householdSetup.dinnersPerWeek ?? null,

        // Cooking
        cooking_skill: client.cookingPreferences.cookingSkill || null,
        cooking_time_preference: client.cookingPreferences.cookingTimePreference || null,

        // Equipment flags
        equip_air_fryer: hasEquip('Air fryer') || null,
        equip_instant_pot: hasEquip('Instant Pot') || null,
        equip_slow_cooker: hasEquip('Slow Cooker') || null,
        equip_sous_vide: hasEquip('Sous Vide') || null,
        equip_cast_iron: hasEquip('Cast Iron') || null,
        equip_smoker: hasEquip('Smoker') || null,
        equip_stick_blender: hasEquip('Stick Blender') || null,
        equip_cuisinart: hasEquip('Cuisinart') || null,
        equip_kitchen_aid: hasEquip('Kitchen Aid') || null,
        equip_vitamix_or_high_speed_blender:
          hasEquip('Vitamix or High Speed Blender (Ninja)') || null,
        equip_fryer: hasEquip('Fryer') || null,
        equip_other_equipment: '', // fill from your "other equipment" text if you collect it

        // Allergies / programs / macros — store as comma text for the explicit cols
        allergies_restrictions:
          (client.dietaryProfile?.allergiesRestrictions || []).join(', ') || null,
        dietary_programs:
          (client.dietaryProfile?.dietaryPrograms || []).join(', ') || null,
        macros: client.dietaryProfile?.notes || null, // or your macro targets text area

        // Shopping & stores
        shopping_preferred_store:
          client.shoppingPreferences?.preferredGroceryStore || null,
        shopping_stores_near_me:
          client.shoppingPreferences?.storesNearMe?.length
            ? client.shoppingPreferences.storesNearMe
            : null,
        shopping_prefer_organic: client.shoppingPreferences?.preferOrganic || null,
        shopping_prefer_national_brands:
          client.shoppingPreferences?.preferNationalBrands || null,
      };

      // 4) insert order
      const { data: created, error: insertErr } = await supabase
        .from('orders')
        .insert(orderRecord)
        .select('id, correlation_id')
        .single();

      if (insertErr) throw insertErr;

      // 5) send to n8n (if webhook configured)
      if (effectiveWebhook) {
        const payload = {
          client,
          generate: {
            menus: true,
            heroImages: true,
            menuCards: true,
            receipt: true,
          },
          correlationId,
          callbackUrl: effectiveCallback,
        };

        await fetch(effectiveWebhook, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {
          /* ignore network errors to avoid blocking UI; order row already saved */
        });
      }

      onSubmitted?.({ orderId: created.id, correlationId });
      alert('Your order was saved and the menu generation has started.');
    } catch (err: any) {
      console.error('Generate Menu failed:', err);
      alert(err?.message || 'Something went wrong saving your order.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      className="px-5 py-2 rounded bg-gray-900 text-white disabled:opacity-60"
      onClick={handleClick}
      disabled={isSubmitting}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? 'Cooking your menu…' : 'Generate Menu'}
    </button>
  );
}
