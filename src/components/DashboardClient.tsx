"use client";

import { useEffect, useState } from "react";
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";
import N8NGenerate from "@/components/N8NGenerate";

import type {
  PantryItem,
  BarItem,
  MenuItem,
  Profile,
  Weekly,
} from "@/lib/types";

// Small helper to read from localStorage safely
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function DashboardClient() {
  // Pantry / Bar / Menus / Cart (unchanged)
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [bar, setBar] = useState<BarItem[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [approvedMenus, setApprovedMenus] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<MenuItem[]>([]);

  // ---- NEW: profile + weekly state that WeeklyPlanner edits ----
  const [profile, setProfile] = useState<Profile>(() =>
    readLS<Profile>("ic_profile", {
      // sensible fallbacks; adjust to your Profile shape as needed
      firstName: "",
      lastName: "",
      email: "",
      accountStreet: "",
      accountCity: "",
      accountState: "",
      accountZipcode: "",
      portionDefault: 4,
      adults: 2,
      teens: 0,
      children: 0,
      toddlers: 0,
      cookingSkill: "Beginner",
      cookingTime: "30 min",
      equipment: [],
      store: "",
    } as unknown as Profile)
  );

  const [weekly, setWeekly] = useState<Weekly>(() =>
    readLS<Weekly>("ic_weekly", {
      dinners: 3,
      mood: "",
      extras: "",
      onHandText: "",
      pantrySnapshot: [],
      barSnapshot: [],
      currentMenusCount: 0,
      budgetType: null,   // 'per_week' | 'per_meal' | null
      budgetValue: null,  // number | null
    } as unknown as Weekly)
  );

  // On-hand image preview (used by WeeklyPlanner camera UI)
  const [onHandPreview, setOnHandPreview] = useState<string | undefined>(undefined);

  // Persist some things locally so the user doesn’t lose them on refresh
  useEffect(() => {
    const storedPantry = localStorage.getItem("ic_pantry");
    if (storedPantry) setPantry(JSON.parse(storedPantry));

    const storedBar = localStorage.getItem("ic_bar");
    if (storedBar) setBar(JSON.parse(storedBar));
  }, []);

  useEffect(() => {
    localStorage.setItem("ic_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("ic_weekly", JSON.stringify(weekly));
  }, [weekly]);

  useEffect(() => {
    localStorage.setItem("ic_pantry", JSON.stringify(pantry));
  }, [pantry]);

  useEffect(() => {
    localStorage.setItem("ic_bar", JSON.stringify(bar));
  }, [bar]);

  // Camera helpers for WeeklyPlanner
  function handleImageToDataUrl(file: File, setter: (v?: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      setter(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.readAsDataURL(file);
  }

  function submitOnHandImage() {
    // If you later upload this image to storage, do it here.
    // For now we just keep the preview; WeeklyPlanner also keeps textual on-hand list.
    alert("On-hand image captured. (Hook up upload if desired.)");
  }

  // If WeeklyPlanner calls this, you can optionally wire it to the N8NGenerate flow.
  // Since N8NGenerate renders its own button, we’ll keep this as a no-op to avoid double submits.
  function generateMenus() {
    // no-op: use the N8NGenerate button below
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Weekly form */}
      <WeeklyPlanner
        profile={profile}
        weekly={weekly}
        setProfile={setProfile}
        setWeekly={setWeekly}
        handleImageToDataUrl={handleImageToDataUrl}
        onHandPreview={onHandPreview}
        setOnHandPreview={setOnHandPreview}
        submitOnHandImage={submitOnHandImage}
        generateMenus={generateMenus}
      />

      {/* Submit to n8n (this button uses the live weekly state so budget flows) */}
      <div>
        <N8NGenerate
          // N8NGenerate fetches the full profile from Supabase itself;
          // If you pass a client payload, keep it minimal — it’s mostly used as fallback/meta.
          client={{
            basicInformation: {
              firstName: profile.firstName ?? "",
              lastName: profile.lastName ?? "",
              email: profile.email ?? "",
              accountAddress: {
                street: (profile as any).accountStreet ?? "",
                city: (profile as any).accountCity ?? "",
                state: (profile as any).accountState ?? "",
                zipcode: (profile as any).accountZipcode ?? "",
              },
            },
            householdSetup: {
              adults: (profile as any).adults ?? 0,
              teens: (profile as any).teens ?? 0,
              children: (profile as any).children ?? 0,
              toddlersInfants: (profile as any).toddlers ?? 0,
              portionsPerDinner: profile.portionDefault ?? 4,
              dinnersPerWeek: weekly.dinners ?? 3,
            },
            cookingPreferences: {
              cookingSkill: profile.cookingSkill ?? "Beginner",
              cookingTimePreference: profile.cookingTime ?? "30 min",
              equipment: Array.isArray((profile as any).equipment)
                ? ((profile as any).equipment as string[])
                : [],
            },
            dietaryProfile: {
              allergiesRestrictions: [],
              dislikesAvoidList: [],
              dietaryPrograms: [],
              notes: undefined,
            },
            shoppingPreferences: {
              storesNearMe: profile.store ? [profile.store] : [],
              preferredGroceryStore: profile.store ?? "",
              preferOrganic: "I dont care",
              preferNationalBrands: "No preference",
            },
            extra: {
              weeklyMood: weekly.mood ?? "",
              weeklyExtras: weekly.extras ?? "",
              weeklyOnHandText: weekly.onHandText ?? "",
              pantrySnapshot: weekly.pantrySnapshot ?? [],
              barSnapshot: weekly.barSnapshot ?? [],
              currentMenusCount: weekly.currentMenusCount ?? 0,
              budgetType: weekly.budgetType ?? null,
              budgetValue: weekly.budgetValue ?? null,
            },
          }}
          weekly={weekly}
        />
      </div>

      {/* Menus & shopping flow */}
      <MenuCards
        menus={menus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
        cart={cart}
        setCart={setCart}
      />

      <ShoppingCart cart={cart} setCart={setCart} />

      <PantrySection pantry={pantry} setPantry={setPantry} />

      <BarSection bar={bar} setBar={setBar} />
    </div>
  );
}
