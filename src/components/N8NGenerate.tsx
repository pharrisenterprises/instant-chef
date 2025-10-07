"use client";

import { useState } from "react";

// Use the public env var on Vercel. Fallback to your exact n8n Production URL
// so this still works even if the env var is missing.
const N8N_URL =
  (process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL as string) ||
  "https://pharrisenterpises.app.n8n.cloud/webhook/Instantly-chef-lead-intake";

type WeeklyPlannerUI = {
  portionsPerDinner: number;
  groceryStore: string;
  dinnersNeededThisWeek: number;
  budgetType: "Per week ($)" | "Per meal ($)" | "none";
  budgetValue: number | "";
  weeklyOnHandText: string;
  weeklyMood: string;
  weeklyExtras: string;
};

export default function N8NGenerate({
  weeklyPlanner,
  pantrySnapshot,
  barSnapshot,
  currentMenusCount,
  onStart, // clear menus in parent
}: {
  weeklyPlanner: WeeklyPlannerUI;
  pantrySnapshot: Array<{ name: string; qty?: string | number }>;
  barSnapshot: Array<{ name: string; qty?: string | number }>;
  currentMenusCount: number;
  onStart?: () => void;
}) {
  const [working, setWorking] = useState(false);

  function readLS<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  async function sendToN8N() {
    try {
      if (!N8N_URL) {
        alert("Missing NEXT_PUBLIC_N8N_WEBHOOK_URL on Vercel.");
        return;
      }

      setWorking(true);
      onStart?.(); // wipe menus immediately

      // ----- Pull the Account Profile blocks you save to localStorage -----
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

      // ----- Normalize weekly planner for backend -----
      const budgetTypeMap: Record<WeeklyPlannerUI["budgetType"], "perWeek" | "perMeal" | "none"> = {
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
        ui: weeklyPlanner, // keep for debug visibility in n8n
      };

      // ----- Final payload sent to n8n -----
      const payload = {
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
        source: "instant-chef-web",
        at: new Date().toISOString(),
      };

      console.log("[N8NGenerate] POST →", N8N_URL, payload);

      const res = await fetch(N8N_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");
      console.log("[N8NGenerate] n8n response", res.status, text);

      if (!res.ok) {
        throw new Error(`n8n rejected (${res.status}): ${text?.slice(0, 600)}`);
      }

      alert("n8n received the request.");
    } catch (err: any) {
      console.error("[N8NGenerate] ERROR", err);
      alert(err?.message || "Failed to POST to n8n. See console for details.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        className={`px-5 py-2 rounded text-white ${working ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
        onClick={sendToN8N}
        disabled={working}
        title="Send to n8n"
      >
        {working ? "Working…" : "Generate Menu (Sample)"}
      </button>

      {/* keep the small secondary indicator if your layout expects it */}
      {working && (
        <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 cursor-not-allowed" disabled>
          Working…
        </button>
      )}
    </div>
  );
}
