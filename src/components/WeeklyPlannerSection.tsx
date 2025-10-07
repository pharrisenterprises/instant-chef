"use client";

import { useState } from "react";
import type { Profile, Weekly } from "@/lib/types";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
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
  onHandPreview?: string;
  setOnHandPreview: (v?: string) => void;
  submitOnHandImage: () => void;
  clearMenus: () => void;
}) {
  const [working, setWorking] = useState(false);

  function budgetTypeLabel(bt: Weekly["budgetType"]): "Per week ($)" | "Per meal ($)" | "none" {
    if (bt === "perWeek") return "Per week ($)";
    if (bt === "perMeal") return "Per meal ($)";
    return "none";
  }

  const weeklyPlanner = {
    portionsPerDinner: profile.portionDefault,
    groceryStore: profile.store ?? "",
    dinnersNeededThisWeek: weekly.dinners ?? 0,
    budgetType: budgetTypeLabel(weekly.budgetType),
    budgetValue: (weekly.budgetValue ?? "") as number | "",
    weeklyOnHandText: weekly.onHandText ?? "",
    weeklyMood: weekly.mood ?? "",
    weeklyExtras: weekly.extras ?? "",
  };

  const pantrySnapshot = (weekly as any)?.pantrySnapshot ?? [];
  const barSnapshot = (weekly as any)?.barSnapshot ?? [];
  const currentMenusCount = Number((weekly as any)?.currentMenusCount ?? 0);

  async function onGenerateMenu() {
    try {
      setWorking(true);
      clearMenus();

      // Read Account Profile blocks saved in localStorage
      type BasicInformation = {
        firstName: string;
        lastName: string;
        email: string;
        accountAddress: { street: string; city: string; state: string; zipcode: string };
      };
      type HouseholdSetup = {
        adults: number;
        teens: number;
        children: number;
        toddlersInfants: number;
        portionsPerDinner: number;
      };
      type CookingPreferences = { cookingSkill: string; cookingTimePreference: string; equipment: string[] };
      type DietaryProfile = {
        allergiesRestrictions: string[];
        dislikesAvoidList: string[];
        dietaryPrograms: string[];
        notes?: string;
      };
      type ShoppingPreferences = {
        storesNearMe: string[];
        preferredGroceryStore: string;
        preferOrganic: string;
        preferNationalBrands: string;
      };

      const basicInformation = readLS<BasicInformation>("ic_basic", {
        firstName: "",
        lastName: "",
        email: "",
        accountAddress: { street: "", city: "", state: "", zipcode: "" },
      });

      const householdSetup = readLS<HouseholdSetup>("ic_house", {
        adults: 0,
        teens: 0,
        children: 0,
        toddlersInfants: 0,
        portionsPerDinner: weeklyPlanner.portionsPerDinner ?? 4,
      });

      const cookingPreferences = readLS<CookingPreferences>("ic_cook", {
        cookingSkill: "Beginner",
        cookingTimePreference: "30 min",
        equipment: [],
      });

      const dietaryProfile = readLS<DietaryProfile>("ic_diet", {
        allergiesRestrictions: [],
        dislikesAvoidList: [],
        dietaryPrograms: [],
      });

      const shoppingPreferences = readLS<ShoppingPreferences>("ic_shop", {
        storesNearMe: [],
        preferredGroceryStore: weeklyPlanner.groceryStore || "",
        preferOrganic: "I dont care",
        preferNationalBrands: "I dont care",
      });

      const budgetTypeMap: Record<typeof weeklyPlanner.budgetType, "perWeek" | "perMeal" | "none"> = {
        "Per week ($)": "perWeek",
        "Per meal ($)": "perMeal",
        none: "none",
      };

      const weeklyPlan = {
        portionsPerDinner:
          householdSetup.portionsPerDinner ?? weeklyPlanner.portionsPerDinner ?? 4,
        groceryStore:
          shoppingPreferences.preferredGroceryStore || weeklyPlanner.groceryStore || "",
        dinnersThisWeek: weeklyPlanner.dinnersNeededThisWeek ?? 0,
        budget: {
          type: budgetTypeMap[weeklyPlanner.budgetType],
          value: weeklyPlanner.budgetValue === "" ? undefined : Number(weeklyPlanner.budgetValue),
        },
        onHandCsv: weeklyPlanner.weeklyOnHandText?.trim() || "",
        mood: weeklyPlanner.weeklyMood?.trim() || "",
        extras: weeklyPlanner.weeklyExtras?.trim() || "",
        ui: weeklyPlanner,
      };

      const body = {
        client: {
          basicInformation,
          householdSetup,
          cookingPreferences,
          dietaryProfile,
          shoppingPreferences,
        },
        weeklyPlan,
        pantrySnapshot,
        barSnapshot,
        currentMenusCount,
        generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
      };

      console.log("[WeeklyPlanner] POST /api/n8n/trigger →", body);

      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const raw = await res.text().catch(() => "");
      let json: any = null;
      try { json = raw ? JSON.parse(raw) : null; } catch {}

      console.log("[WeeklyPlanner] /api/n8n/trigger response", res.status, json || raw);

      if (!res.ok) {
        const msg = json?.error || json?.details || raw || `Trigger failed with HTTP ${res.status}`;
        throw new Error(msg);
      }

      if (json?.correlationId) console.log("[WeeklyPlanner] correlationId:", json.correlationId);
      alert("n8n trigger accepted.");
    } catch (err: any) {
      console.error("[WeeklyPlanner] ERROR:", err);
      alert(err?.message || "Failed to trigger n8n. See console for details.");
    } finally {
      setWorking(false);
    }
  }

  async function testTrigger() {
    // Minimal ping to prove /api/n8n/trigger is reachable from this page
    try {
      const r = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping: "ok" }),
      });
      const t = await r.text();
      console.log("[WeeklyPlanner] Test Trigger status:", r.status, t);
      alert(`Test Trigger → HTTP ${r.status}`);
    } catch (e) {
      console.error("[WeeklyPlanner] Test Trigger error:", e);
      alert("Test Trigger failed. See console.");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">Weekly Menu Planning</h2>

      {/* … your existing inputs unchanged … */}

      <div className="mt-6 flex justify-end gap-3">
        {/* Debug helper — remove once working */}
        <button
          className="px-5 py-2 rounded border"
          onClick={testTrigger}
          title="Sends a minimal payload to /api/n8n/trigger"
        >
          Test Trigger
        </button>

        <button
          className={`px-5 py-2 rounded text-white ${working ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
          onClick={onGenerateMenu}
          disabled={working}
        >
          {working ? "Working…" : "Generate Menu"}
        </button>
      </div>
    </div>
  );
}
