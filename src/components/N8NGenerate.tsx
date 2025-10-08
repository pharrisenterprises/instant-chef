// src/components/N8NGenerate.tsx
"use client";

import { useState } from "react";
import type { Profile, Weekly } from "@/lib/types";

type Props = {
  profile: Profile;
  weekly: Weekly;
  /** Optional: if you show the signed-in email in the header, pass it here */
  userEmailFromHeader?: string;
  /** Optional callback after a successful submit */
  onSubmitted?: (result: any) => void;
};

export default function N8NGenerate({
  profile,
  weekly,
  userEmailFromHeader,
  onSubmitted,
}: Props) {
  const [loading, setLoading] = useState(false);

  // ---- NEW: server-routed submit that merges Account Profile from Supabase ----
  async function submitToN8N() {
    try {
      setLoading(true);

      // Prefer the profile email; fall back to header if provided
      const email =
        // some codebases keep email at profile.basicInformation.email; others at profile.email
        (profile as any)?.basicInformation?.email ||
        (profile as any)?.email ||
        userEmailFromHeader ||
        "";

      if (!email) {
        alert("Email is required to submit.");
        setLoading(false);
        return;
      }

      // Map your current UI state shape to the server’s expected "weekly" shape.
      // - WeeklyPlanner uses: weekly.dinners, weekly.onHandText, weekly.mood, weekly.extras
      // - Profile carries: portionDefault (portions per dinner), store (preferred grocery store)
      const body = {
        email,
        weekly: {
          portionsPerDinner:
            (profile as any)?.portionDefault ?? (weekly as any)?.portionsPerDinner ?? 0,
          dinnersPerWeek: (weekly as any)?.dinners ?? (weekly as any)?.dinnersPerWeek ?? 0,

          preferredGroceryStore:
            (profile as any)?.store ??
            (weekly as any)?.preferredGroceryStore ??
            undefined,

          // If you track these in profile/weekly, pass them through. Otherwise undefined is fine.
          preferOrganic: (profile as any)?.preferOrganic ?? (weekly as any)?.preferOrganic,
          preferNationalBrands:
            (profile as any)?.preferNationalBrands ?? (weekly as any)?.preferNationalBrands,

          weeklyMood: (weekly as any)?.mood ?? "",
          weeklyExtras: (weekly as any)?.extras ?? "",
          weeklyOnHandText: (weekly as any)?.onHandText ?? "",

          // If your Weekly state already holds these snapshots, they’ll flow through.
          pantrySnapshot: (weekly as any)?.pantrySnapshot ?? [],
          barSnapshot: (weekly as any)?.barSnapshot ?? [],
          currentMenusCount: (weekly as any)?.currentMenusCount ?? 0,
        },

        // You can tweak these flags as needed
        generate: { menus: true, heroImages: true, menuCards: true, receipt: true },

        // Correlation + callback to track async n8n work
        correlationId:
          (typeof crypto !== "undefined" && crypto.randomUUID)
            ? crypto.randomUUID()
            : `corr-${Date.now()}`,
        callbackUrl: `${window.location.origin}/api/n8n/callback`,
      };

      const resp = await fetch("/api/n8n/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        console.error("n8n forward failed:", json);
        alert("Could not submit to n8n. Check console for details.");
        setLoading(false);
        return;
      }

      onSubmitted?.(json);
      setLoading(false);
      // Optional UX: toast/snackbar here
    } catch (err) {
      console.error(err);
      alert("Unexpected error while submitting to n8n.");
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-3 justify-end">
      <button
        onClick={submitToN8N}
        disabled={loading}
        className="px-5 py-2 rounded bg-black text-white disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Generate Menu"}
      </button>
    </div>
  );
}
