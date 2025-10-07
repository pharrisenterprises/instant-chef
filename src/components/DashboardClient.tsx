"use client";

import { useEffect, useState } from "react";
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";
import type { PantryItem, BarItem, MenuItem } from "@/lib/types";

export default function DashboardClient() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

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

  useEffect(() => {
    const storedPantry = localStorage.getItem("ic_pantry");
    if (storedPantry) setPantry(JSON.parse(storedPantry));
    const storedBar = localStorage.getItem("ic_bar");
    if (storedBar) setBar(JSON.parse(storedBar));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const json = await res.json();
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

  async function generateMenus() {
    if (loading || !profileData) {
      alert("Profile not loaded yet — wait a sec then try again.");
      return;
    }

    const p = profileData;

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
      dietaryPrograms: p.dietary_programs && p.dietary_programs !== "No" ? [p.dietary_programs] : [],
    };

    const shoppingPreferences = {
      storesNearMe: p.stores_near_me ? [p.stores_near_me] : [],
      preferredGroceryStore: p.preferred_store ?? weekly.groceryStore ?? "",
      preferOrganic: p.organic_preference ?? "I dont care",
      preferNationalBrands: p.brand_preference ?? "No preference",
    };

    const weeklyPlan = {
      dinnersThisWeek: weekly.dinners,
      portionsPerDinner: householdSetup.portionsPerDinner ?? 4,
      groceryStore: shoppingPreferences.preferredGroceryStore ?? "Kroger",
      budget: {
        type: weekly.budgetType ?? "none",
        value: weekly.budgetValue || undefined,
      },
      onHandCsv: weekly.onHandCsv?.trim() || "",
      mood: weekly.mood?.trim() || "",
      extras: weekly.extras?.trim() || "",
      ui: weekly,
    };

    const pantrySnapshot = pantry.map((x) => ({ name: x.name, qty: x.qty, measure: x.measure }));
    const barSnapshot = bar.map((x) => ({ name: x.name, qty: x.qty, measure: x.measure }));

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

    const payload = {
      client,
      weeklyPlan,
      pantrySnapshot,
      barSnapshot,
      currentMenusCount: menus?.length ?? 0,
      generate: { menus: true, heroImages: true, menuCards: true, receipt: true },
    };

    console.log("CLIENT → /api/n8n/trigger (short)", {
      firstName: client.basicInformation.firstName,
      lastName: client.basicInformation.lastName,
      email: client.basicInformation.email,
    });

    const res = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Trigger failed (${res.status}): ${txt?.slice(0, 200)}`);
      return;
    }

    const { correlationId } = await res.json();
    console.log("✅ started", correlationId);
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading profile…</div>;
  }

  return (
    <div className="space-y-8">
      <WeeklyPlanner
        profile={profileData as any}
        weekly={weekly as any}
        setProfile={() => {}}
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
      <MenuCards menus={menus} approvedMenus={approvedMenus} setApprovedMenus={setApprovedMenus} />
    </div>
  );
}
