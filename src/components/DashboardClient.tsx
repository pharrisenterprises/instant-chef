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
  });

  // 🔹 Load pantry/bar if saved locally
  useEffect(() => {
    const storedPantry = localStorage.getItem("ic_pantry");
    if (storedPantry) setPantry(JSON.parse(storedPantry));
    const storedBar = localStorage.getItem("ic_bar");
    if (storedBar) setBar(JSON.parse(storedBar));
  }, []);

  // 🔹 Fetch profile from server
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const json = await res.json();
        if (json?.data) {
          setProfileData(json.data);
        } else {
          console.error("No data returned from /api/profile:", json);
        }
      } catch (e) {
        console.error("Failed to fetch profile:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 🔹 Build and send payload
  async function generateMenus() {
    if (loading || !profileData) {
      alert("Profile not loaded yet — please wait.");
      return;
    }

    const profile = profileData;

    const basicInformation = {
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      email: profile.email ?? "",
      accountAddress: {
        street: profile.account_street ?? "",
        city: profile.account_city ?? "",
        state: profile.account_state ?? "",
        zipcode: profile.account_zipcode ?? "",
      },
    };

    const householdSetup = {
      adults: profile.adults ?? 0,
      teens: profile.teens ?? 0,
      children: profile.children ?? 0,
      toddlersInfants: profile.toddlers ?? 0,
      portionsPerDinner: profile.portions_per_dinner ?? 4,
      dinnersPerWeek: profile.dinners_per_week ?? weekly.dinners,
    };

    const cookingPreferences = {
      cookingSkill: profile.cooking_skill ?? "Beginner",
      cookingTimePreference: profile.cooking_time ?? "30 min",
      equipment: Array.isArray(profile.equipment)
        ? profile.equipment
        : profile.equipment
        ? [profile.equipment]
        : [],
    };

    const dietaryProfile = {
      allergiesRestrictions:
        profile.allergies && profile.allergies !== "No"
          ? [profile.allergies]
          : [],
      dislikesAvoidList: profile.dislikes ? [profile.dislikes] : [],
      dietaryPrograms:
        profile.dietary_programs && profile.dietary_programs !== "No"
          ? [profile.dietary_programs]
          : [],
    };

    const shoppingPreferences = {
      storesNearMe: profile.stores_near_me ? [profile.stores_near_me] : [],
      preferredGroceryStore: profile.preferred_store ?? "",
      preferOrganic: profile.organic_preference ?? "I dont care",
      preferNationalBrands: profile.brand_preference ?? "No preference",
    };

    const weeklyPlan = {
      dinnersThisWeek: weekly.dinners,
      portionsPerDinner: householdSetup.portionsPerDinner ?? 4,
      groceryStore:
        shoppingPreferences.preferredGroceryStore || "Kroger",
      budget: {
        type: weekly.budgetType ?? "none",
        value: weekly.budgetValue || undefined,
      },
      onHandCsv: weekly.onHandCsv?.trim() || "",
      mood: weekly.mood?.trim() || "",
      extras: weekly.extras?.trim() || "",
      ui: weekly,
    };

    const pantrySnapshot = pantry.map((p) => ({
      name: p.name,
      qty: p.qty,
      measure: p.measure,
    }));
    const barSnapshot = bar.map((b) => ({
      name: b.name,
      qty: b.qty,
      measure: b.measure,
    }));

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

    console.log("🚀 Sending to /api/n8n/trigger", payload);

    const res = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`N8N trigger failed (${res.status}): ${txt?.slice(0, 200)}`);
      return;
    }

    const { correlationId } = await res.json();
    console.log("✅ Workflow started:", correlationId);
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading your Supabase profile...
      </div>
    );
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
      <MenuCards
        menus={menus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
      />
    </div>
  );
}
