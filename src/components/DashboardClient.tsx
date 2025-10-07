"use client";

import { useEffect, useState } from "react";
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";
import type { PantryItem, BarItem, MenuItem } from "@/lib/types";

export default function DashboardClient() {
  // --- Profile (from /api/profile) ---
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // --- Other app state ---
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [bar, setBar] = useState<BarItem[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [approvedMenus, setApprovedMenus] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<MenuItem[]>([]);

  const [weekly, setWeekly] = useState({
    dinners: 4,
    budgetType: "none" as "perWeek" | "perMeal" | "none",
    budgetValue: 0,
    onHandCsv: "",
    mood: "",
    extras: "",
    groceryStore: "Kroger",
  });

  // Load pantry/bar from localStorage (optional)
  useEffect(() => {
    try {
      const p = localStorage.getItem("ic_pantry");
      if (p) setPantry(JSON.parse(p));
      const b = localStorage.getItem("ic_bar");
      if (b) setBar(JSON.parse(b));
    } catch {
      // ignore JSON errors
    }
  }, []);

  // Fetch profile from server (uses service role on backend)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const json = await res.json();
        console.log("PROFILE FROM /api/profile", json);
        if (json?.ok && json.data) {
          setProfileData(json.data);
        } else {
          console.error("No profile data:", json);
        }
      } catch (e) {
        console.error("Failed to fetch /api/profile", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build and send payload to /api/n8n/trigger
  async function generateMenus() {
    if (loading || !profileData) {
      alert("Profile not loaded yet — please wait a second and try again.");
      return;
    }

    const p = profileData as {
      email: string;
      first_name: string | null;
      last_name: string | null;
      account_street: string | null;
      account_city: string | null;
      account_state: string | null;
      account_zipcode: string | null;
      adults: number | null;
      teens: number | null;
      children: number | null;
      toddlers: number | null;
      portions_per_dinner: number | null;
      dinners_per_week: number | null;
      cooking_skill: string | null;
      cooking_time: string | null;
      equipment: string[] | string | null;
      allergies: string | null;
      dislikes: string | null;
      dietary_programs: string | null;
      preferred_store: string | null;
      organic_preference: string | null;
      brand_preference: string | null;
      stores_near_me: string | null;
    };

    const basicInformation = {
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      email: p.email ?? "",
      accountAddress: {
        street: p.account_street ?? "",
        city: p.account_city ?? "",
        state: p.account_state ?? "",
        zipcode: p.account_zipcode ?? "",
      },
    };

    const householdSetup = {
      adults: p.adults ?? 0,
      teens: p.teens ?? 0,
      children: p.children ?? 0,
      toddlersInfants: p.toddlers ?? 0,
      portionsPerDinner: p.portions_per_dinner ?? 4,
      dinnersPerWeek: p.dinners_per_week ?? weekly.dinners,
    };

    const cookingPreferences = {
      cookingSkill: p.cooking_skill ?? "Beginner",
      cookingTimePreference: p.cooking_time ?? "30 min",
      equipment: Array.isArray(p.equipment)
        ? p.equipment
        : p.equipment
        ? [p.equipment]
        : [],
    };

    const dietaryProfile = {
      allergiesRestrictions: p.allergies && p.allergies !== "No" ? [p.allergies] : [],
      dislikesAvoidList: p.dislikes ? [p.dislikes] : [],
      dietaryPrograms:
        p.dietary_programs && p.dietary_programs !== "No" ? [p.dietary_programs] : [],
    };

    const shoppingPreferences = {
      storesNearMe: p.stores_near_me ? [p.stores_near_me] : [],
      preferredGroceryStore: p.preferred_store ?? weekly.groceryStore ?? "",
      preferOrganic: p.organic_preference ?? "I dont care",
      preferNationalBrands: p.brand_preference ?? "No preference",
    };

    const weeklyPlan = {
      dinnersThisWeek: weekly.dinners,
      portionsPerDinner: householdSetup.portionsPerDinner,
      groceryStore: shoppingPreferences.preferredGroceryStore || "Kroger",
      budget: {
        type: weekly.budgetType ?? "none",
        value: weekly.budgetValue || undefined,
      },
      onHandCsv: (weekly.onHandCsv || "").trim(),
      mood: (weekly.mood || "").trim(),
      extras: (weekly.extras || "").trim(),
      ui: weekly,
    };

    const pantrySnapshot = pantry.map((x) => ({
      name: x.name,
      qty: x.qty,
      measure: x.measure,
    }));
    const barSnapshot = bar.map((x) => ({
      name: x.name,
      qty: x.qty,
      measure: x.measure,
    }));

    const payload = {
      client: {
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
      },
      weeklyPlan,
      pantrySnapshot,
      barSnapshot,
      currentMenusCount: menus?.length ?? 0,
      generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
    };

    // Visibility for you in DevTools & Vercel logs
    console.log("CLIENT → /api/n8n/trigger (short)", {
      firstName: basicInformation.firstName,
      lastName: basicInformation.lastName,
      email: basicInformation.email,
    });

    const res = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Trigger failed (${res.status}): ${txt.slice(0, 200)}`);
      return;
    }

    const { correlationId } = await res.json();
    console.log("✅ n8n workflow started", correlationId);
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading your profile…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WeeklyPlanner
        // the planner can still render with these
        profile={profileData as any}
        weekly={weekly as any}
        setProfile={() => {}}
        setWeekly={setWeekly as any}
        handleImageToDataUrl={() => {}}
        onHandPreview={undefined}
        setOnHandPreview={() => {}}
        submitOnHandImage={() => {}}
        // 👇 only path to generate
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
      <MenuCards
        menus={menus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
      />
    </div>
  );
}
