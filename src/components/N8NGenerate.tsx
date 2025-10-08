"use client";
import { useState } from "react";

type Basic = {
  firstName: string; lastName: string; email: string;
  accountAddress?: { street?: string; city?: string; state?: string; zipcode?: string };
};
type ClientPayload = {
  basicInformation?: Partial<Basic>;
  householdSetup?: any;
  cookingPreferences?: any;
  dietaryProfile?: any;
  shoppingPreferences?: any;
  extra?: any;
};

function readLS<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fb; } catch { return fb; }
}
function split(v?: string) {
  return (v || "").split(",").map(s => s.trim()).filter(Boolean);
}
function pickProfile(): Partial<ClientPayload> {
  // Read from both the new and historical keys so it works across your old pages
  const acct = readLS<any>("accountProfile", null) ?? readLS<any>("IC_ACCOUNT", null) ?? null;
  const basicOld = readLS<any>("IC_BASIC", null);
  const houseOld = readLS<any>("IC_HOUSE", null);
  const cookOld  = readLS<any>("IC_COOK", null);
  const dietOld  = readLS<any>("IC_DIET", null);
  const shopOld  = readLS<any>("IC_SHOP", null);

  const basicInformation: Partial<Basic> = acct ? {
    firstName: acct.firstName || "",
    lastName:  acct.lastName  || "",
    email:     acct.email     || "",
    accountAddress: {
      street:  acct.address?.street  || "",
      city:    acct.address?.city    || "",
      state:   acct.address?.state   || "",
      zipcode: acct.address?.zipcode || "",
    }
  } : basicOld ? {
    firstName: basicOld.firstName || "",
    lastName:  basicOld.lastName  || "",
    email:     basicOld.email     || "",
    accountAddress: {
      street: basicOld.street || "",
      city:   basicOld.city   || "",
      state:  basicOld.state  || "",
      zipcode: basicOld.zipcode || "",
    }
  } : {};

  const householdSetup = acct ? {
    adults: +acct.adults || 0, teens: +acct.teens || 0, children: +acct.children || 0,
    toddlersInfants: +acct.toddlers || 0,
    portionsPerDinner: +acct.portionsPerMeal || 0,
    dinnersPerWeek: +acct.dinnersPerWeek || 0,
  } : (houseOld || {});

  const cookingPreferences = acct ? {
    cookingSkill: acct.cookingSkill || "Beginner",
    cookingTimePreference: acct.cookingTime || "30 min",
    equipment: Array.isArray(acct.equipment) ? acct.equipment : split(acct.equipment),
  } : (cookOld || {});

  const dietaryProfile = acct ? {
    allergiesRestrictions: split(acct.allergies),
    dislikesAvoidList: split(acct.dislikes),
    dietaryPrograms: split(acct.dietaryPrograms),
    notes: acct.macros || "",
  } : (dietOld || {});

  const shoppingPreferences = acct ? {
    storesNearMe: split(acct.storesNearby),
    preferredGroceryStore: acct.preferredStore || "",
    preferOrganic: acct.organicPreference || "I dont care",
    preferNationalBrands: acct.brandPreference || "No preference",
  } : (shopOld || {});

  return { basicInformation, householdSetup, cookingPreferences, dietaryProfile, shoppingPreferences };
}
function mergeSection<T extends object>(a?: T, b?: T): T {
  // Caller wins; profile fills gaps.
  return { ...(b || {}), ...(a || {}) } as T;
}

export default function N8NGenerate({ client }: { client: ClientPayload }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    try {
      setErr(null);
      setBusy(true);

      // Enrich with any saved Account Profile we can find
      const p = pickProfile();
      const merged: ClientPayload = {
        ...client,
        basicInformation: mergeSection(client?.basicInformation, p.basicInformation),
        householdSetup: mergeSection(client?.householdSetup, p.householdSetup),
        cookingPreferences: mergeSection(client?.cookingPreferences, p.cookingPreferences),
        dietaryProfile: mergeSection(client?.dietaryProfile, p.dietaryProfile),
        shoppingPreferences: mergeSection(client?.shoppingPreferences, p.shoppingPreferences),
      };

      // Do NOT block on the client; the server will back-fill from Supabase if needed
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: merged,
          generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || `Trigger failed (${res.status})`);
      }

      // …(your existing polling for /api/n8n/callback can stay as-is here)…
    } catch (e: any) {
      setErr(e?.message || "Failed to start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button disabled={busy} onClick={run} className="px-4 py-2 rounded bg-black text-white">
        {busy ? "Generating…" : "Generate Menu"}
      </button>
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}
