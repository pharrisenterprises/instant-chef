// src/components/N8NGenerate.tsx
"use client";

import { useState } from "react";
import type { Profile, Weekly } from "@/lib/types";

type Props = {
  profile: Profile;
  weekly: Weekly;
  /** If your header already knows the selected email, pass it here (recommended). */
  userEmailFromHeader?: string;
  onSubmitted?: (result: any) => void;
};

function resolveEmail(opts: {
  profile?: any;
  weekly?: any;
  userEmailFromHeader?: string;
}): string | undefined {
  const { profile, weekly, userEmailFromHeader } = opts;

  // 1) obvious places
  const fromProfile =
    profile?.basicInformation?.email ||
    profile?.email ||
    profile?.user?.email ||
    undefined;

  const fromWeekly = weekly?.email || undefined;

  // 2) header dropdown / input (add one of these attributes to your header control)
  const fromHeaderDom = (() => {
    const sel =
      (document.querySelector("[data-user-email]") as HTMLInputElement | HTMLSelectElement | null) ||
      (document.querySelector("#user-email") as HTMLInputElement | HTMLSelectElement | null) ||
      (document.querySelector('[name="user-email"]') as HTMLInputElement | HTMLSelectElement | null);

    const v =
      (sel && ("value" in sel ? sel.value : (sel as any).textContent))?.trim() || "";

    return v.includes("@") ? v : undefined;
  })();

  // 3) localStorage fallbacks (set once when user chooses email in header)
  const fromLS =
    (typeof window !== "undefined" && (localStorage.getItem("ic.email") || localStorage.getItem("ic.userEmail") || localStorage.getItem("ic.profile.email"))) ||
    undefined;

  return (
    fromProfile ||
    userEmailFromHeader ||
    fromWeekly ||
    fromHeaderDom ||
    (fromLS && fromLS.includes("@") ? fromLS : undefined)
  );
}

export default function N8NGenerate({
  profile,
  weekly,
  userEmailFromHeader,
  onSubmitted,
}: Props) {
  const [loading, setLoading] = useState(false);
  if (!finalEmail) {
    const acct = document.querySelector('input[type="email"]') as HTMLInputElement | null;
    const guess = acct?.value?.trim();
    if (guess?.includes("@")) {
      try { localStorage.setItem("ic.email", guess); } catch {}
    }
  }

  async function submitToN8N() {
    try {
      setLoading(true);

      const email = resolveEmail({ profile, weekly, userEmailFromHeader });
      if (!email) {
        // Last-ditch: try to read any visible SELECT in the header
        const anyHeaderSelect = document.querySelector("header select") as HTMLSelectElement | null;
        const guess = anyHeaderSelect?.value?.trim();
        if (guess && guess.includes("@")) {
          localStorage.setItem("ic.email", guess);
        }
      }

      const finalEmail = email || localStorage.getItem("ic.email") || "";
      if (!finalEmail) {
        setLoading(false);
        alert("Email is required to submit. Tip: add data-user-email to your header email dropdown and we’ll read it automatically.");
        return;
      }

      // Save for future runs
      try {
        localStorage.setItem("ic.email", finalEmail);
      } catch {}

      // Build the weekly portion of the payload (the server will merge profile from Supabase)
      const body = {
        email: finalEmail,
        weekly: {
          portionsPerDinner:
            (profile as any)?.portionDefault ??
            (weekly as any)?.portionsPerDinner ??
            0,
          dinnersPerWeek:
            (weekly as any)?.dinners ??
            (weekly as any)?.dinnersPerWeek ??
            0,
          preferredGroceryStore:
            (profile as any)?.store ??
            (weekly as any)?.preferredGroceryStore ??
            undefined,
          preferOrganic:
            (profile as any)?.preferOrganic ??
            (weekly as any)?.preferOrganic,
          preferNationalBrands:
            (profile as any)?.preferNationalBrands ??
            (weekly as any)?.preferNationalBrands,
          weeklyMood: (weekly as any)?.mood ?? "",
          weeklyExtras: (weekly as any)?.extras ?? "",
          weeklyOnHandText: (weekly as any)?.onHandText ?? "",
          pantrySnapshot: (weekly as any)?.pantrySnapshot ?? [],
          barSnapshot: (weekly as any)?.barSnapshot ?? [],
          currentMenusCount: (weekly as any)?.currentMenusCount ?? 0,
        },
        generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
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
