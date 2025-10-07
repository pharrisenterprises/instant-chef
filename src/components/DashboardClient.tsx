"use client";

import { useEffect, useState } from "react";
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";
import type { PantryItem, BarItem, MenuItem } from "@/lib/types";

/* ---------- Types ---------- */
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
type CookingPreferences = {
  cookingSkill: string;
  cookingTimePreference: string;
  equipment: string[];
};
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

/* ---------- Local Storage Helper ---------- */
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ---------- Component ---------- */
export default function DashboardClient() {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [bar, setBar] = useState<BarItem[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [approvedMenus, setApprovedMenus] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<MenuItem[]>([]);

  // Weekly + Profile UI state
  const [profile, setProfile] = useState({
    portionDefault: 4,
    store: "",
  });
  const [weekly, setWeekly] = useState({
    dinners: 4,
    budgetType: "perWeek" as "perWeek" | "perMeal" | "none",
    budgetValue: 0,
    onHandCsv: "",
    mood: "",
    extras: "",
  });

  /* ---------- Hydrate pantry & bar ---------- */
  useEffect(() => {
    const storedPantry = localStorage.getItem("ic_pantry");
    if (storedPantry) setPantry(JSON.parse(storedPantry));
    const storedBar = localStorage.getItem("ic_bar");
    if (storedBar) setBar(JSON.parse(storedBar));
  }, []);

  /* ---------- Generate Menus (send to N8N) ---------- */
  async function generateMenus() {
    // Load persisted profile blocks
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

    // Merge runtime weekly UI
    const weeklyPlan = {
      dinnersThisWeek: weekly.dinners,
      portionsPerDinner: householdSetup.portionsPerDinner ?? profile.portionDefault ?? 4,
      groceryStore: shoppingPreferences.preferredGroceryStore || profile.store || "",
      budget: {
        type: weekly.budgetType ?? "none",
        value: weekly.budgetValue || undefined,
      },
      onHandCsv: weekly.onHandCsv?.trim() || "",
      mood: weekly.mood?.trim() || "",
      extras: weekly.extras?.trim() || "",
      ui: weekly,
    };

    // Pantry / Bar Snapshots
    const pantrySnapshot = (pantry || []).map((p) => ({
      name: p.name,
      qty: p.qty,
      measure: p.measure,
    }));
    const barSnapshot = (bar || []).map((b) => ({
      name: b.name,
      qty: b.qty,
      measure: b.measure,
    }));

    // Combine everything into client object
    const client = {
      basicInformation,
      householdSetup,
      cookingPreferences,
      dietaryProfile,
      shoppingPreferences,
      extra: {
        weeklyMood: weekly.mood,
        weeklyExtras: weekly.extras,
        weeklyOnHandText: weekly.onHandCsv,
        pantrySnapshot,
        barSnapshot,
        currentMenusCount: menus?.length ?? 0,
      },
    };

    // Final payload
    const payload = {
      client,
      weeklyPlan,
      pantrySnapshot,
      barSnapshot,
      currentMenusCount: menus?.length ?? 0,
      generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
    };

    console.log("Sending payload → /api/n8n/trigger", payload);

    // Send to API route that forwards to n8n
    const res = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Failed to trigger n8n (${res.status}). ${txt?.slice(0, 200)}`);
      return;
    }

    const { correlationId } = (await res.json()) as { correlationId: string };
    console.log("✅ n8n workflow started:", correlationId);

    // Optional: Poll for results
    const interval = setInterval(async () => {
      const r = await fetch(`/api/n8n/callback?cid=${encodeURIComponent(correlationId)}`, {
        cache: "no-store",
      });
      if (r.status === 204) return; // Not ready yet
      const data = await r.json().catch(() => null);
      if (data?.status === "done") {
        clearInterval(interval);
        console.log("✅ n8n result received:", data);
        // You can setMenus(data.result.menus) here if needed
      }
    }, 2000);
  }

  /* ---------- UI ---------- */
  return (
    <div className="space-y-8">
      <WeeklyPlanner
        profile={profile as any}
        weekly={weekly as any}
        setProfile={setProfile as any}
        setWeekly={setWeekly as any}
        handleImageToDataUrl={() => {}}
        onHandPreview={undefined}
        setOnHandPreview={() => {}}
        submitOnHandImage={() => {}}
        generateMenus={generateMenus}
        menus={menus}
        setMenus={setMenus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
        cart={cart}
        setCart={setCart}
      />

      <ShoppingCart cart={cart} setCart={setCart} />
      <PantrySection pantry={pantry} setPantry={setPantry} />
      <BarSection bar={bar} setBar={setBar} />

      {/* Menu cards will be populated after n8n callback */}
      <MenuCards
        menus={menus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
      />
    </div>
  );
}
