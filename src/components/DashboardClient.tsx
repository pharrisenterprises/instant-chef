"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";
import type { PantryItem, BarItem, MenuItem } from "@/lib/types";

export default function DashboardClient() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>({});
  const [household, setHousehold] = useState<any>({});
  const [cookingPrefs, setCookingPrefs] = useState<any>({});
  const [dietary, setDietary] = useState<any>({});
  const [shopping, setShopping] = useState<any>({});

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

  // ✅ Fetch profile data from Supabase
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "email, first_name, last_name, account_street, account_city, account_state, account_zipcode, adults, teens, children, toddlers, portions_per_dinner, dinners_per_week, cooking_skill, cooking_time, equipment, allergies, dislikes, dietary_programs, preferred_store, organic_preference, brand_preference"
          )
          .eq("email", "pharrisenterprises@gmail.com") // 🔥 TEMP hardcoded; replace with current session email if needed
          .single();

        if (error) throw error;
        if (!data) throw new Error("No profile found");

        // Basic Info
        setProfile({
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          accountAddress: {
            street: data.account_street ?? "",
            city: data.account_city ?? "",
            state: data.account_state ?? "",
            zipcode: data.account_zipcode ?? "",
          },
        });

        // Household
        setHousehold({
          adults: data.adults ?? 0,
          teens: data.teens ?? 0,
          children: data.children ?? 0,
          toddlersInfants: data.toddlers ?? 0,
          portionsPerDinner: data.portions_per_dinner ?? 4,
          dinnersPerWeek: data.dinners_per_week ?? 4,
        });

        // Cooking Preferences
        setCookingPrefs({
          cookingSkill: data.cooking_skill ?? "Beginner",
          cookingTimePreference: data.cooking_time ?? "30 min",
          equipment: Array.isArray(data.equipment)
            ? data.equipment
            : data.equipment
            ? [data.equipment]
            : [],
        });

        // Dietary Profile
        setDietary({
          allergiesRestrictions:
            data.allergies && data.allergies !== "No"
              ? [data.allergies]
              : [],
          dislikesAvoidList: data.dislikes ? [data.dislikes] : [],
          dietaryPrograms:
            data.dietary_programs && data.dietary_programs !== "No"
              ? [data.dietary_programs]
              : [],
        });

        // Shopping Preferences
        setShopping({
          storesNearMe: data.stores_near_me ? [data.stores_near_me] : [],
          preferredGroceryStore: data.preferred_store ?? "",
          preferOrganic: data.organic_preference ?? "I dont care",
          preferNationalBrands: data.brand_preference ?? "No preference",
        });
      } catch (err) {
        console.error("Supabase fetch failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ Generate menus and send to N8N
  async function generateMenus() {
    if (loading) {
      alert("Please wait — loading profile data from Supabase...");
      return;
    }

    const weeklyPlan = {
      dinnersThisWeek: weekly.dinners,
      portionsPerDinner: household.portionsPerDinner ?? 4,
      groceryStore: shopping.preferredGroceryStore ?? "",
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
      basicInformation: profile,
      householdSetup: household,
      cookingPreferences: cookingPrefs,
      dietaryProfile: dietary,
      shoppingPreferences: shopping,
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

    console.log("💾 SUPABASE PROFILE DATA", {
      profile,
      household,
      cookingPrefs,
      dietary,
      shopping,
    });


    console.log("🔥 Sending to /api/n8n/trigger", payload);

    const res = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Failed to trigger N8N (${res.status}) ${txt?.slice(0, 150)}`);
      return;
    }

    const { correlationId } = await res.json();
    console.log("✅ Workflow started:", correlationId);
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading your account data from Supabase...
      </div>
    );
  }

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
      <MenuCards
        menus={menus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
      />
    </div>
  );
}
