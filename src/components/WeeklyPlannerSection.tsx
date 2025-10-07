"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Profile, Weekly } from "@/lib/types";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL as string; // must be set on Vercel

// ---------- localStorage helpers ----------
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---------- defensive getters ----------
function getFirstAvailable<T = any>(obj: any, paths: string[], fallback: T): T {
  for (const p of paths) {
    const v = p.split(".").reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return fallback;
}

function uuidLike() {
  // crypto.randomUUID is best, but fall back safely
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return "cid-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function WeeklyPlanner({
  profile,
  weekly,
  setProfile,
  setWeekly,
  handleImageToDataUrl,
  onHandPreview,
  setOnHandPreview,
  submitOnHandImage,
  clearMenus, // pass from parent to wipe menus before generation
}: {
  profile: Profile;
  weekly: Weekly;
  setProfile: (p: Profile) => void;
  setWeekly: (w: Weekly) => void;
  handleImageToDataUrl: (file: File, setter: (v?: string) => void) => void;
  onHandPreview?: string | null;
  setOnHandPreview: (v: string | null) => void;
  submitOnHandImage: () => Promise<void>;
  clearMenus: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const cidRef = useRef<string | null>(null);

  // ---------- hydrate from LS on first mount ----------
  useEffect(() => {
    const cachedProfile = readLS<Profile>("profile", profile);
    const cachedWeekly = readLS<Weekly>("weekly", weekly);
    // Only hydrate if LS actually has something meaningful
    setProfile(cachedProfile);
    setWeekly(cachedWeekly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- persist to LS when state changes ----------
  useEffect(() => {
    writeLS("profile", profile);
  }, [profile]);
  useEffect(() => {
    writeLS("weekly", weekly);
  }, [weekly]);

  // ---------- derived fields (defensive) ----------
  const mapped = useMemo(() => {
    const p: any = profile || {};
    const w: any = weekly || {};

    // Basic info
    const firstName = getFirstAvailable(p, ["basicInformation.firstName", "firstName", "name.first"], "");
    const lastName = getFirstAvailable(p, ["basicInformation.lastName", "lastName", "name.last"], "");
    const email = getFirstAvailable(p, ["basicInformation.email", "email", "contact.email"], "");

    // Address
    const street = getFirstAvailable(p, ["basicInformation.accountAddress.street", "accountAddress.street", "address.street"], "");
    const city = getFirstAvailable(p, ["basicInformation.accountAddress.city", "accountAddress.city", "address.city"], "");
    const state = getFirstAvailable(p, ["basicInformation.accountAddress.state", "accountAddress.state", "address.state"], "");
    const zipcode = getFirstAvailable(p, ["basicInformation.accountAddress.zipcode", "accountAddress.zipcode", "address.zipcode"], "");

    // Household
    const adults = Number(getFirstAvailable(p, ["householdSetup.adults", "adults"], 0));
    const teens = Number(getFirstAvailable(p, ["householdSetup.teens", "teens"], 0));
    const children = Number(getFirstAvailable(p, ["householdSetup.children", "children"], 0));
    const toddlersInfants = Number(getFirstAvailable(p, ["householdSetup.toddlersInfants", "toddlersInfants"], 0));

    // From weekly or profile (defensive)
    const portionsPerDinner = Number(getFirstAvailable(w, ["portionsPerDinner"], getFirstAvailable(p, ["householdSetup.portionsPerDinner", "portionsPerDinner"], 2)));
    const dinnersPerWeek = Number(getFirstAvailable(w, ["dinnersThisWeek", "dinnersPerWeek"], getFirstAvailable(p, ["householdSetup.dinnersPerWeek", "dinnersPerWeek"], 3)));

    // Cooking preferences
    const cookingSkill = getFirstAvailable(p, ["cookingPreferences.cookingSkill", "cookingSkill"], "Beginner");
    const cookingTimePreference = getFirstAvailable(p, ["cookingPreferences.cookingTimePreference", "cookingTimePreference"], "30 min");
    const equipment = getFirstAvailable<string[]>(p, ["cookingPreferences.equipment", "equipment"], []) || [];

    // Dietary
    const allergiesRestrictions = getFirstAvailable<string[]>(p, ["dietaryProfile.allergiesRestrictions", "allergiesRestrictions"], []) || [];
    const dislikesAvoidList = getFirstAvailable<string[]>(p, ["dietaryProfile.dislikesAvoidList", "dislikesAvoidList"], []) || [];
    const dietaryPrograms = getFirstAvailable<string[]>(p, ["dietaryProfile.dietaryPrograms", "dietaryPrograms"], []) || [];

    // Shopping prefs
    const storesNearMe = getFirstAvailable<string[]>(p, ["shoppingPreferences.storesNearMe", "storesNearMe"], []) || [];
    const preferredGroceryStore = getFirstAvailable(p, ["shoppingPreferences.preferredGroceryStore", "preferredGroceryStore", "weekly.groceryStore"], w?.groceryStore ?? "");
    const preferOrganic = getFirstAvailable(p, ["shoppingPreferences.preferOrganic", "preferOrganic"], "I dont care");
    const preferNationalBrands = getFirstAvailable(p, ["shoppingPreferences.preferNationalBrands", "preferNationalBrands"], "No preference");

    // Weekly inputs from the UI
    const onHandCsv = getFirstAvailable(w, ["onHandCsv", "onHandText"], "");
    const mood = getFirstAvailable(w, ["mood"], "");
    const extras = getFirstAvailable(w, ["extras"], "");
    const groceryStore = getFirstAvailable(w, ["groceryStore"], preferredGroceryStore || "");

    // Budget
    const budgetType = getFirstAvailable(w, ["budget.type", "budgetType"], "none");
    const budgetValue = getFirstAvailable(w, ["budget.value", "budgetValue"], "");
    const budget = budgetType === "none" ? { type: "none" } : { type: budgetType, value: budgetValue };

    // Inventory / bar snapshots if you’re tracking them on profile
    const pantrySnapshot =
      getFirstAvailable<any[]>(p, ["extra.pantrySnapshot", "pantrySnapshot"], []) || [];
    const barSnapshot =
      getFirstAvailable<any[]>(p, ["extra.barSnapshot", "barSnapshot"], []) || [];

    // UI menus count
    const currentMenusCount =
      Number(getFirstAvailable(w, ["menus.length"], 0)) ||
      Number(getFirstAvailable(p, ["extra.currentMenusCount"], 0)) ||
      0;

    return {
      basic: { firstName, lastName, email, street, city, state, zipcode },
      household: { adults, teens, children, toddlersInfants, portionsPerDinner, dinnersPerWeek },
      cooking: { cookingSkill, cookingTimePreference, equipment },
      dietary: { allergiesRestrictions, dislikesAvoidList, dietaryPrograms },
      shopping: { storesNearMe, preferredGroceryStore, preferOrganic, preferNationalBrands },
      weeklyBits: { onHandCsv, mood, extras, groceryStore, budget },
      inventory: { pantrySnapshot, barSnapshot, currentMenusCount },
    };
  }, [profile, weekly]);

  async function handleGenerate() {
    if (!N8N_URL) {
      alert("N8N webhook URL is missing (NEXT_PUBLIC_N8N_WEBHOOK_URL).");
      return;
    }

    // wipe existing menus from UI immediately as requested
    try {
      clearMenus();
    } catch {}

    setGenerating(true);
    const correlationId = uuidLike();
    cidRef.current = correlationId;

    const callbackUrl =
      (typeof window !== "undefined" &&
        `${window.location.origin}/api/n8n/callback?cid=${encodeURIComponent(correlationId)}`) ||
      "";

    // Build the exact payload n8n expects
    const body = {
      correlationId,
      callbackUrl,
      client: {
        basicInformation: {
          firstName: mapped.basic.firstName,
          lastName: mapped.basic.lastName,
          email: mapped.basic.email,
          accountAddress: {
            street: mapped.basic.street,
            city: mapped.basic.city,
            state: mapped.basic.state,
            zipcode: mapped.basic.zipcode,
          },
        },
        householdSetup: {
          adults: mapped.household.adults,
          teens: mapped.household.teens,
          children: mapped.household.children,
          toddlersInfants: mapped.household.toddlersInfants,
          portionsPerDinner: mapped.household.portionsPerDinner,
          dinnersPerWeek: mapped.household.dinnersPerWeek,
        },
        cookingPreferences: {
          cookingSkill: mapped.cooking.cookingSkill,
          cookingTimePreference: mapped.cooking.cookingTimePreference,
          equipment: mapped.cooking.equipment,
        },
        dietaryProfile: {
          allergiesRestrictions: mapped.dietary.allergiesRestrictions,
          dislikesAvoidList: mapped.dietary.dislikesAvoidList,
          dietaryPrograms: mapped.dietary.dietaryPrograms,
        },
        shoppingPreferences: {
          storesNearMe: mapped.shopping.storesNearMe,
          preferredGroceryStore: mapped.shopping.preferredGroceryStore,
          preferOrganic: mapped.shopping.preferOrganic,
          preferNationalBrands: mapped.shopping.preferNationalBrands,
        },
        extra: {
          weeklyMood: mapped.weeklyBits.mood,
          weeklyExtras: mapped.weeklyBits.extras,
          weeklyOnHandText: mapped.weeklyBits.onHandCsv,
          pantrySnapshot: mapped.inventory.pantrySnapshot,
          barSnapshot: mapped.inventory.barSnapshot,
          currentMenusCount: mapped.inventory.currentMenusCount,
        },
      },
      weeklyPlan: {
        dinnersThisWeek: mapped.household.dinnersPerWeek,
        portionsPerDinner: mapped.household.portionsPerDinner,
        groceryStore: mapped.weeklyBits.groceryStore,
        budget: mapped.weeklyBits.budget,
        onHandCsv: mapped.weeklyBits.onHandCsv,
        mood: mapped.weeklyBits.mood,
        extras: mapped.weeklyBits.extras,
        ui: {},
      },
      pantrySnapshot: mapped.inventory.pantrySnapshot,
      barSnapshot: mapped.inventory.barSnapshot,
      currentMenusCount: mapped.inventory.currentMenusCount,
      generate: {
        menus: true,
        heroImages: true,
        menuCards: true,
        receipt: true,
      },
    };

    try {
      const res = await fetch(N8N_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Webhook returned ${res.status} ${res.statusText} ${txt}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to contact n8n webhook. Check console/network logs.");
    } finally {
      setGenerating(false);
    }
  }

  // ------------- UI (your existing inputs remain; only button logic changed) -------------
  // Render your existing form here. The key change is the Generate button’s onClick.

  return (
    <div className="space-y-4">
      {/* ... all your existing inputs/fields here ... */}

      <div className="flex items-center gap-3">
        <button
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "Generating…" : "Generate Menu (Sample)"}
        </button>

        {generating ? (
          <span className="text-sm text-gray-600">
            Waiting on n8n… (cid {cidRef.current?.slice(0, 8)}…)
          </span>
        ) : null}
      </div>
    </div>
  );
}
