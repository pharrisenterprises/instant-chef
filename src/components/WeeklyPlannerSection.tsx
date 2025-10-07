"use client";

import { useState } from "react";
import type { Profile, Weekly } from "@/lib/types";

/**
 * Small helper to safely read JSON from localStorage.
 */
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
  const [loading, setLoading] = useState(false);

  function budgetTypeLabel(bt: Weekly["budgetType"]): "Per week ($)" | "Per meal ($)" | "none" {
    if (bt === "perWeek") return "Per week ($)";
    if (bt === "perMeal") return "Per meal ($)";
    return "none";
  }

  // This mirrors the object you were passing into N8NGenerate for UI display
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

  // Snapshots previously threaded through Weekly via parent
  const pantrySnapshot = (weekly as any)?.pantrySnapshot ?? [];
  const barSnapshot = (weekly as any)?.barSnapshot ?? [];
  const currentMenusCount = Number((weekly as any)?.currentMenusCount ?? 0);

  /**
   * Build a consolidated payload from:
   * - Account Profile (localStorage keys saved by your profile flow)
   * - Weekly Planner (this component)
   * - Pantry / Bar snapshots
   * Then POST to /api/n8n/trigger to kick off the workflow.
   */
  async function onGenerateMenu() {
    try {
      setLoading(true);
      clearMenus(); // immediately wipe any old menus in the UI

      // ---- Account Profile blocks saved earlier in localStorage ----
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
        portionsPerDinner: profile.portionDefault ?? 4,
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
        preferredGroceryStore: profile.store || "",
        preferOrganic: "I dont care",
        preferNationalBrands: "I dont care",
      });

      // ---- Weekly planner normalized block for n8n ----
      const weeklyPlan = {
        portionsPerDinner:
          householdSetup.portionsPerDinner ?? profile.portionDefault ?? weeklyPlanner.portionsPerDinner ?? 4,
        groceryStore: shoppingPreferences.preferredGroceryStore || profile.store || "",
        dinnersThisWeek: weekly.dinners ?? 0,
        budget: {
          type: weekly.budgetType, // 'perWeek' | 'perMeal' | 'none'
          value: weekly.budgetValue ?? undefined,
        },
        onHandCsv: weekly.onHandText?.trim() || "",
        mood: weekly.mood?.trim() || "",
        extras: weekly.extras?.trim() || "",
        // optional debug / ui mirrors:
        ui: weeklyPlanner,
      };

      // ---- Inventory / extras snapshots ----
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
        // downstream flags so n8n knows what to produce
        generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
      };

      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`n8n trigger failed (${res.status}): ${t.slice(0, 300)}`);
      }

      // If you want to react to the correlationId here, you can:
      // const { correlationId } = await res.json();

      // UI can optionally show a toast; polling is done elsewhere if needed.
    } catch (err: any) {
      console.error("Generate Menu error:", err);
      alert(err?.message || "Failed to generate menu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">Weekly Menu Planning</h2>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">Portions per Dinner</label>
          <div className="flex items-center gap-2 mt-1">
            <button
              className="px-2 py-1 border rounded"
              onClick={() =>
                setProfile({ ...profile, portionDefault: Math.max(1, profile.portionDefault - 1) })
              }
              disabled={loading}
            >
              -
            </button>
            <input
              type="number"
              className="w-20 border rounded px-2 py-1 text-center"
              value={profile.portionDefault}
              onChange={(e) =>
                setProfile({ ...profile, portionDefault: Math.max(1, +e.target.value) })
              }
              disabled={loading}
            />
            <button
              className="px-2 py-1 border rounded"
              onClick={() => setProfile({ ...profile, portionDefault: profile.portionDefault + 1 })}
              disabled={loading}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Grocery Store</label>
          <input
            className="w-full border rounded px-3 py-2 mt-1"
            value={profile.store}
            onChange={(e) => setProfile({ ...profile, store: e.target.value })}
            placeholder="e.g., Kroger"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Dinners Needed This Week</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 mt-1"
            value={weekly.dinners}
            onChange={(e) => setWeekly({ ...weekly, dinners: Math.max(1, +e.target.value) })}
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium">Budget Type</label>
          <select
            className="w-full border rounded px-3 py-2 mt-1"
            value={weekly.budgetType}
            onChange={(e) => setWeekly({ ...weekly, budgetType: e.target.value as Weekly["budgetType"] })}
            disabled={loading}
          >
            <option value="none">No budget</option>
            <option value="perWeek">Per week ($)</option>
            <option value="perMeal">Per meal ($)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Budget Value</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 mt-1"
            value={weekly.budgetValue ?? ""}
            onChange={(e) =>
              setWeekly({
                ...weekly,
                budgetValue: e.target.value === "" ? undefined : Math.max(0, +e.target.value),
              })
            }
            placeholder="e.g., 150"
            disabled={loading}
          />
        </div>
        <div className="flex items-end">
          <p className="text-xs text-gray-600">Specify weekly $ or per-meal $. Leave blank to skip.</p>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          Do you have any ingredients on hand that you would like us to use in menu planning for this week?
        </label>
        <p className="text-xs text-gray-600">
          (please list items with quantity included — separated by commas: e.g. 4 roma tomatoes, 2 lb boneless
          chicken thighs, 3 bell peppers, 4 oz truffle oil)
        </p>
        <textarea
          className="w-full border rounded px-3 py-2 mt-1"
          rows={3}
          value={weekly.onHandText}
          onChange={(e) => setWeekly({ ...weekly, onHandText: e.target.value })}
          disabled={loading}
        />
        <div className="flex items-center gap-3 mt-2">
          <label className="px-3 py-2 border rounded cursor-pointer bg-white hover:bg-gray-50">
            📷 Camera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageToDataUrl(file, setOnHandPreview);
              }}
              disabled={loading}
            />
          </label>
          {onHandPreview && (
            <div className="flex items-center gap-3">
              <img
                src={onHandPreview}
                alt="On hand preview"
                width="64"
                height="64"
                className="rounded object-cover"
              />
              <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={submitOnHandImage} disabled={loading}>
                Submit
              </button>
              <button className="px-3 py-2 rounded border bg-white" onClick={() => setOnHandPreview(undefined)} disabled={loading}>
                Retake
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          What are you in the mood for this week? (tell us what you're feeling like – if you have any goals, etc.)
        </label>
        <input
          className="w-full border rounded px-3 py-2 mt-1"
          value={weekly.mood}
          onChange={(e) => setWeekly({ ...weekly, mood: e.target.value })}
          disabled={loading}
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          Specify if there is anything else you want to see on the menu? (Italian, Ribeye, Indian, Pad Thai, etc.)
        </label>
        <input
          className="w-full border rounded px-3 py-2 mt-1"
          value={weekly.extras}
          onChange={(e) => setWeekly({ ...weekly, extras: e.target.value })}
          disabled={loading}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          className={`px-5 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
          onClick={onGenerateMenu}
          disabled={loading}
          title="Generate Menu"
        >
          {loading ? "Generating…" : "Generate Menu"}
        </button>
      </div>
    </div>
  );
}
