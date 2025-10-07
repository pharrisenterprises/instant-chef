"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // 👈 make sure this is installed
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";
import type { PantryItem, BarItem, MenuItem } from "@/lib/types";

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
  dinnersPerWeek?: number;
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
};
type ShoppingPreferences = {
  storesNearMe: string[];
  preferredGroceryStore: string;
  preferOrganic: string;
  preferNationalBrands: string;
};

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

  // 🟢 Fetch user data from Supabase
  useEffect(() => {
    (async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select(
            "first_name, last_name, email, street, city, state, zipcode, adults, teens, children, toddlers, portions_per_dinner, cooking_skill, cooking_time_pref, equipment, allergies, dislikes, programs, store, prefer_organic, prefer_brands"
          )
          .single();

        if (userError) throw userError;
        if (userData) {
          // Map supabase fields to app structure
          setProfile({
            firstName: userData.first_name,
            lastName: userData.last_name,
            email: userData.email,
            accountAddress: {
              street: userData.street,
              city: userData.city,
              state: userData.state,
              zipcode: userData.zipcode,
            },
          });

          setHousehold({
            adults: userData.adults ?? 0,
            teens: userData.teens ?? 0,
            children: userData.children ?? 0,
            toddlersInfants: userData.toddlers ?? 0,
            portionsPerDinner: userData.portions_per_dinner ?? 4,
            dinnersPerWeek: weekly.dinners,
          });

          setCookingPrefs({
            cookingSkill: userData.cooking_skill ?? "Beginner",
            cookingTimePreference: userData.cooking_time_pref ?? "30 min",
            equipment: userData.equipment ?? [],
          });

          setDietary({
            allergiesRestrictions: userData.allergies ?? [],
            dislikesAvoidList: userData.dislikes ?? [],
            dietaryPrograms: userData.programs ?? [],
          });

          setShopping({
            storesNearMe: [],
            preferredGroceryStore: userData.store ?? "",
            preferOrganic: userData.prefer_organic ?? "I dont care",
            preferNationalBrands: userData.prefer_brands ?? "No preference",
          });
        }
      } catch (err) {
        console.error("Failed to load Supabase profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function generateMenus() {
    if (loading) {
      alert("Please wait, loading profile data...");
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

    console.log("Sending to /api/n8n/trigger", payload);

    const res = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Failed to trigger n8n (${res.status}): ${txt?.slice(0, 200)}`);
      return;
    }

    const { correlationId } = await res.json();
    console.log("✅ n8n workflow started:", correlationId);
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading your account data...
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
