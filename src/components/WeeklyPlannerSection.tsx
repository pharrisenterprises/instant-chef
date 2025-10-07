"use client";

import { useState } from "react";
import type { Profile, Weekly } from "@/lib/types";
import N8NGenerate from "@/components/N8NGenerate";

export default function WeeklyPlanner({
  profile,
  weekly,
  setProfile,
  setWeekly,
  handleImageToDataUrl,
  onHandPreview,
  setOnHandPreview,
  submitOnHandImage,
  clearMenus, // (optional) if you want to clear menus before generation, hook it inside N8NGenerate start()
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
  // This local "working" state is no longer used to disable inputs during generation
  // because N8NGenerate handles its own loading/polling state.
  const [working] = useState(false);

  // map stored weekly.budgetType ('none' | 'perWeek' | 'perMeal') to label used in the UI (not needed by N8NGenerate)
  function budgetTypeLabel(bt: Weekly["budgetType"]): "Per week ($)" | "Per meal ($)" | "none" {
    if (bt === "perWeek") return "Per week ($)";
    if (bt === "perMeal") return "Per meal ($)";
    return "none";
  }

  // Snapshots (if present on weekly from parent)
  const pantrySnapshot = (weekly as any)?.pantrySnapshot ?? [];
  const barSnapshot = (weekly as any)?.barSnapshot ?? [];
  const currentMenusCount = Number((weekly as any)?.currentMenusCount ?? 0);

  // Build the client payload from your Profile page fields.
  // N8NGenerate will merge this with any localStorage blocks too (ic_basic, ic_house, etc.).
  const clientPayload = {
    basicInformation: {
      firstName: (profile as any)?.firstName ?? "",
      lastName: (profile as any)?.lastName ?? "",
      email: (profile as any)?.email ?? "",
      accountAddress: {
        street: (profile as any)?.street ?? "",
        city: (profile as any)?.city ?? "",
        state: (profile as any)?.state ?? "",
        zipcode: (profile as any)?.zipcode ?? "",
      },
    },
    householdSetup: {
      adults: (profile as any)?.adults ?? 0,
      teens: (profile as any)?.teens ?? 0,
      children: (profile as any)?.children ?? 0,
      toddlersInfants: (profile as any)?.toddlersInfants ?? 0,
      portionsPerDinner: profile?.portionDefault ?? 4,
      dinnersPerWeek: (weekly?.dinners as number) ?? undefined,
    },
    cookingPreferences: {
      cookingSkill: (profile as any)?.cookingSkill ?? "Beginner",
      cookingTimePreference: (profile as any)?.cookingTimePreference ?? "30 min",
      equipment: (profile as any)?.equipment ?? [],
    },
    dietaryProfile: {
      allergiesRestrictions: (profile as any)?.allergiesRestrictions ?? [],
      dislikesAvoidList: (profile as any)?.dislikesAvoidList ?? [],
      dietaryPrograms: (profile as any)?.dietaryPrograms ?? [],
      notes: (profile as any)?.dietNotes ?? "",
    },
    shoppingPreferences: {
      storesNearMe: (profile as any)?.storesNearMe ?? [],
      preferredGroceryStore: profile?.store ?? "",
      preferOrganic: (profile as any)?.preferOrganic ?? "I dont care",
      preferNationalBrands: (profile as any)?.preferNationalBrands ?? "No preference",
    },
    // add anything else you want to carry through
    extra: {},
  };

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
              disabled={working}
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
              disabled={working}
            />
            <button
              className="px-2 py-1 border rounded"
              onClick={() => setProfile({ ...profile, portionDefault: profile.portionDefault + 1 })}
              disabled={working}
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
            disabled={working}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Dinners Needed This Week</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 mt-1"
            value={weekly.dinners}
            onChange={(e) => setWeekly({ ...weekly, dinners: Math.max(1, +e.target.value) })}
            disabled={working}
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
            disabled={working}
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
            disabled={working}
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
          (please list items with quantity included — separated by commas: e.g. 4 roma tomatoes, 2 lb boneless chicken thighs, 3 bell peppers, 4 oz truffle oil)
        </p>
        <textarea
          className="w-full border rounded px-3 py-2 mt-1"
          rows={3}
          value={weekly.onHandText}
          onChange={(e) => setWeekly({ ...weekly, onHandText: e.target.value })}
          disabled={working}
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
              disabled={working}
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
              <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={submitOnHandImage} disabled={working}>
                Submit
              </button>
              <button className="px-3 py-2 rounded border bg-white" onClick={() => setOnHandPreview(undefined)} disabled={working}>
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
          disabled={working}
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
          disabled={working}
        />
      </div>

      {/* === This is the important bit: send everything to N8NGenerate === */}
      <div className="mt-6 flex justify-end">
        <N8NGenerate
          client={clientPayload}
          weekly={{
            portionsPerDinner: profile.portionDefault,
            groceryStore: profile.store,
            dinners: weekly.dinners,
            budgetType: weekly.budgetType,     // 'none' | 'perWeek' | 'perMeal' (component also accepts the label strings)
            budgetValue: weekly.budgetValue,
            onHandText: weekly.onHandText,
            mood: weekly.mood,
            extras: weekly.extras,
          }}
          pantrySnapshot={pantrySnapshot}
          barSnapshot={barSnapshot}
          currentMenusCount={currentMenusCount}
        />
      </div>
    </div>
  );
}
