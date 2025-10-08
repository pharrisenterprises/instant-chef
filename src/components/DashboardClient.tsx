"use client";

import { useEffect, useRef, useState } from "react";
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";

import type { PantryItem, BarItem, MenuItem } from "@/lib/types";

// small helper
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function DashboardClient() {
  // pantry / bar
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [bar, setBar] = useState<BarItem[]>([]);

  // menus
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<MenuItem[]>([]);

  // weekly planner light state (match your UI fields)
  const [weekly, setWeekly] = useState<any>({
    dinners: 4,
    groceryStore: "",
    onHandCsv: "",
    mood: "",
    extras: "",
    budgetType: "Per week ($)",
    budgetValue: "",
    cuisineWish: "",
  });

  // status
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // poll timers
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    pollTimer.current = null;
    timeoutTimer.current = null;
  }

  // load pantry / bar on mount
  useEffect(() => {
    setPantry(readLS<PantryItem[]>("ic_pantry", []));
    setBar(readLS<BarItem[]>("ic_bar", []));
  }, []);

  // ---- AGGREGATE CLIENT PAYLOAD ----
  function buildClientPayload() {
    // your Account Profile screen stores at this key (from your uploaded file)
    const acct = readLS<any>("accountProfile", null);

    const basicInformation = {
      firstName: acct?.firstName || "",
      lastName: acct?.lastName || "",
      email: acct?.email || "",
      accountAddress: {
        street: acct?.address?.street || "",
        city: acct?.address?.city || "",
        state: acct?.address?.state || "",
        zipcode: acct?.address?.zipcode || "",
      },
    };

    const householdSetup = {
      adults: Number(acct?.adults ?? 0),
      teens: Number(acct?.teens ?? 0),
      children: Number(acct?.children ?? 0),
      toddlersInfants: Number(acct?.toddlers ?? 0),
      portionsPerDinner: Number(acct?.portionsPerMeal ?? 0),
      dinnersPerWeek: Number(acct?.dinnersPerWeek ?? 0),
    };

    const cookingPreferences = {
      cookingSkill: acct?.cookingSkill || "Beginner",
      cookingTimePreference: acct?.cookingTime || "30 min",
      equipment: Array.isArray(acct?.equipment) ? acct.equipment : [],
    };

    const dietaryProfile = {
      allergiesRestrictions: (acct?.allergies || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
      dislikesAvoidList: (acct?.dislikes || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
      dietaryPrograms: (acct?.dietaryPrograms || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
      notes: acct?.macros || "",
    };

    const shoppingPreferences = {
      storesNearMe: (acct?.storesNearby || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
      preferredGroceryStore: acct?.preferredStore || "",
      preferOrganic: acct?.organicPreference || "I dont care",
      preferNationalBrands: acct?.brandPreference || "I dont care",
    };

    const extra = {
      weeklyMood: weekly?.mood || "",
      weeklyExtras: weekly?.extras || "",
      weeklyOnHandText: weekly?.onHandCsv || "",
      budgetType: weekly?.budgetType || "",
      budgetValue: weekly?.budgetValue || "",
      cuisineWish: weekly?.cuisineWish || "",
      pantrySnapshot: pantry,
      barSnapshot: bar,
      dinnersRequested: weekly?.dinners ?? 0,
      groceryStore: weekly?.groceryStore || "",
      currentMenusCount: menus?.length ?? 0,
    };

    return {
      basicInformation,
      householdSetup,
      cookingPreferences,
      dietaryProfile,
      shoppingPreferences,
      extra,
    };
  }

  // ---- TRIGGER & POLL n8n VIA OUR API ----
  async function generateMenus() {
    setError(null);
    setBusy(true);
    clearTimers();
    // hide stale menus during generation
    setMenus([]);

    try {
      const client = buildClientPayload();

      // quick guard: require email; server can back-fill names, but email is key
      if (!client.basicInformation.email) {
        throw new Error(
          "Please fill your Account Profile first (first name, last name, email)."
        );
      }

      const triggerRes = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client,
          generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
        }),
      });

      const triggerJson = await triggerRes.json().catch(() => ({}));
      if (!triggerRes.ok) {
        throw new Error(triggerJson?.error || `Trigger failed (${triggerRes.status})`);
      }

      const cid = triggerJson?.correlationId as string;
      if (!cid) throw new Error("No correlationId returned from trigger.");

      // poll every 2s, hard timeout at 2 minutes
      pollTimer.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/n8n/callback?cid=${encodeURIComponent(cid)}`, {
            cache: "no-store",
          });
          const txt = await res.text();
          let data: any = null;
          try {
            if (txt) data = JSON.parse(txt);
          } catch {
            data = null;
          }
          if (data && (data.status === "done" || data.ok === true || data.result)) {
            // Accept multiple shapes – put your workflow's menus path here
            const newMenus: MenuItem[] =
              data?.result?.menus ||
              data?.menus ||
              data?.data?.menus ||
              [];

            setMenus(Array.isArray(newMenus) ? newMenus : []);
            clearTimers();
            setBusy(false);
          }
        } catch {
          // ignore single poll failures
        }
      }, 2000);

      timeoutTimer.current = setTimeout(() => {
        clearTimers();
        setBusy(false);
        setError(
          "Timed out waiting for results from n8n. Verify your n8n workflow and callback URL."
        );
      }, 120000);
    } catch (e: any) {
      clearTimers();
      setBusy(false);
      setError(e?.message || "Failed to generate menus.");
    }
  }

  // cleanup timers on unmount
  useEffect(() => () => clearTimers(), []);

  return (
    <div className="flex flex-col gap-8 p-6">
      <WeeklyPlanner
        weekly={weekly}
        setWeekly={setWeekly}
        generateMenus={generateMenus}
      />

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {/* Your MenuCardsSection (uploaded version takes only `menus`) */}
      <MenuCards menus={menus} />

      <ShoppingCart cart={cart} setCart={setCart} />
      <PantrySection pantry={pantry} setPantry={setPantry} />
      <BarSection bar={bar} setBar={setBar} />
    </div>
  );
}
