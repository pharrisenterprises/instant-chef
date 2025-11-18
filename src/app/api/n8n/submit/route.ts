// app/api/n8n/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type WeeklyIn = {
  weekly: {
    portionsPerDinner: number;
    dinnersPerWeek: number;
    preferredGroceryStore?: string | null;
    preferOrganic?: string | null;
    preferNationalBrands?: string | null;
    weeklyMood?: string | null;
    weeklyExtras?: string | null;
    weeklyOnHandText?: string | null;
    pantrySnapshot?: any[]; // keep as-is
    barSnapshot?: any[];    // keep as-is
    currentMenusCount?: number;
  };
  // the signed-in user email that keys the profile
  email: string;
  correlationId?: string;
  callbackUrl?: string;
  generate?: {
    menus?: boolean;
    heroImages?: boolean;
    menuCards?: boolean;
    receipt?: boolean;
  };
};

function mapRowToClient(row: any) {
  // Adjust the column names if yours differ
  return {
    basicInformation: {
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      email: row.email ?? "",
      accountAddress: {
        street: row.account_street ?? "",
        city: row.account_city ?? "",
        state: row.account_state ?? "",
        zipcode: row.account_zipcode ?? "",
      },
    },
    householdSetup: {
      adults: Number(row.adults ?? 0),
      teens: Number(row.teens ?? 0),
      children: Number(row.children ?? 0),
      toddlersInfants: Number(row.toddlers ?? 0),
      portionsPerDinner: Number(row.portions_per_dinner ?? 0),
      dinnersPerWeek: Number(row.dinners_per_week ?? 0),
    },
    cookingPreferences: {
      cookingSkill: row.cooking_skill ?? "",
      cookingTimePreference: row.cooking_time ?? "",
      equipment: Array.isArray(row.equipment) ? row.equipment : (row.equipment ? String(row.equipment).split(",").map((s:string)=>s.trim()).filter(Boolean) : []),
    },
    dietaryProfile: {
      allergiesRestrictions: Array.isArray(row.allergies) ? row.allergies : (row.allergies ? String(row.allergies).split(",").map((s:string)=>s.trim()).filter(Boolean) : []),
      dislikesAvoidList: Array.isArray(row.dislikes) ? row.dislikes : (row.dislikes ? String(row.dislikes).split(",").map((s:string)=>s.trim()).filter(Boolean) : []),
      dietaryPrograms: Array.isArray(row.dietary_programs) ? row.dietary_programs : (row.dietary_programs ? String(row.dietary_programs).split(",").map((s:string)=>s.trim()).filter(Boolean) : []),
      notes: row.macro_notes ?? row.notes ?? "",
    },
    shoppingPreferences: {
      storesNearMe: Array.isArray(row.stores_near_me) ? row.stores_near_me : (row.stores_near_me ? String(row.stores_near_me).split(",").map((s:string)=>s.trim()).filter(Boolean) : []),
      preferredGroceryStore: row.preferred_store ?? "",
      preferOrganic: row.organic_preference ?? "",
      preferNationalBrands: row.brand_preference ?? "",
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WeeklyIn;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!; // server-side only env

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !N8N_WEBHOOK_URL) {
      return NextResponse.json(
        { error: "Missing required env vars (Supabase or N8N_WEBHOOK_URL)" },
        { status: 500 }
      );
    }

    if (!body?.email) {
      return NextResponse.json({ error: "Missing email in request body" }, { status: 400 });
    }

    // 1) Get the Account Profile row for this email
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Update table/column names if needed
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", body.email)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const profile = rows ? mapRowToClient(rows) : mapRowToClient({ email: body.email });

    // 2) Merge Weekly Planning values (client) over profile defaults where appropriate
    const merged = {
      client: {
        ...profile,
        // keep weekly values in their rightful places
        householdSetup: {
          ...profile.householdSetup,
          portionsPerDinner: body.weekly?.portionsPerDinner ?? profile.householdSetup.portionsPerDinner,
          dinnersPerWeek: body.weekly?.dinnersPerWeek ?? profile.householdSetup.dinnersPerWeek,
        },
        shoppingPreferences: {
          ...profile.shoppingPreferences,
          preferredGroceryStore: body.weekly?.preferredGroceryStore ?? profile.shoppingPreferences.preferredGroceryStore,
          preferOrganic: body.weekly?.preferOrganic ?? profile.shoppingPreferences.preferOrganic,
          preferNationalBrands: body.weekly?.preferNationalBrands ?? profile.shoppingPreferences.preferNationalBrands,
        },
        extra: {
          weeklyMood: body.weekly?.weeklyMood ?? "",
          weeklyExtras: body.weekly?.weeklyExtras ?? "",
          weeklyOnHandText: body.weekly?.weeklyOnHandText ?? "",
          pantrySnapshot: body.weekly?.pantrySnapshot ?? [],
          barSnapshot: body.weekly?.barSnapshot ?? [],
          currentMenusCount: body.weekly?.currentMenusCount ?? 0,
        },
      },
      generate: {
        menus: body.generate?.menus ?? true,
        heroImages: body.generate?.heroImages ?? true,
        menuCards: body.generate?.menuCards ?? true,
        receipt: body.generate?.receipt ?? true,
      },
      correlationId: body.correlationId ?? crypto.randomUUID(),
      callbackUrl: body.callbackUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL}/api/n8n/callback`,
    };

    // 3) Forward to n8n webhook
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });

    const n8nText = await res.text();
    const ok = res.ok;

    return NextResponse.json({ ok, forwarded: merged, n8nResponse: n8nText });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
