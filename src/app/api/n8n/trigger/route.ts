// src/app/api/n8n/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { createClient as createAdmin } from "@supabase/supabase-js";
import crypto from "crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";

// ==== ENV ====
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // must be set in Vercel
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;

const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// If your table has a single fixed name, set it here:
const PROFILE_TABLE = "profiles"; // <— change if your table is named differently

// ==== helpers ====
const splitCSV = (v?: string) =>
  (v || "").split(",").map((s) => s.trim()).filter(Boolean);

const namesFromEmail = (email?: string) => {
  const handle = (email || "").split("@")[0] || "";
  const clean = handle.replace(/[._-]+/g, " ").trim();
  if (!clean) return { firstName: "", lastName: "" };
  const p = clean.split(/\s+/);
  return p.length === 1
    ? { firstName: p[0], lastName: "" }
    : { firstName: p[0], lastName: p.slice(1).join(" ") };
};

function merge<A extends object, B extends object>(a?: A, b?: B) {
  // a (incoming client) wins; b (DB) fills gaps
  return { ...(b || {}), ...(a || {}) };
}

function buildCallbackUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (explicit) return `${explicit}/api/n8n/callback`;
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  return `${proto}://${host}/api/n8n/callback`;
}

// Map your profile row -> n8n client sections
function rowToClient(row: any) {
  if (!row) return {};

  const basicInformation = {
    firstName: row.first_name ?? row.firstName ?? "",
    lastName: row.last_name ?? row.lastName ?? "",
    email: row.email ?? row.user_email ?? "",
    accountAddress: {
      street: row.address_street ?? row.street ?? row.address?.street ?? "",
      city: row.address_city ?? row.city ?? row.address?.city ?? "",
      state: row.address_state ?? row.state ?? row.address?.state ?? "",
      zipcode: row.address_zipcode ?? row.zip ?? row.zipcode ?? row.address?.zipcode ?? "",
    },
  };

  const householdSetup = {
    adults: Number(row.adults ?? 0),
    teens: Number(row.teens ?? 0),
    children: Number(row.children ?? 0),
    toddlersInfants: Number(row.toddlers ?? row.toddlers_infants ?? 0),
    portionsPerDinner: Number(row.portions_per_meal ?? row.portions_per_dinner ?? 0),
    dinnersPerWeek: Number(row.dinners_per_week ?? 0),
  };

  const cookingPreferences = {
    cookingSkill: row.cooking_skill ?? "Beginner",
    cookingTimePreference: row.cooking_time ?? "30 min",
    equipment: Array.isArray(row.equipment) ? row.equipment : splitCSV(row.equipment),
  };

  const dietaryProfile = {
    allergiesRestrictions: Array.isArray(row.allergies) ? row.allergies : splitCSV(row.allergies),
    dislikesAvoidList: Array.isArray(row.dislikes) ? row.dislikes : splitCSV(row.dislikes),
    dietaryPrograms: Array.isArray(row.dietary_programs) ? row.dietary_programs : splitCSV(row.dietary_programs),
    notes: row.macros ?? row.macro_notes ?? "",
  };

  const shoppingPreferences = {
    storesNearMe: Array.isArray(row.stores_nearby) ? row.stores_nearby : splitCSV(row.stores_nearby),
    preferredGroceryStore: row.preferred_store ?? row.grocery_store ?? "",
    preferOrganic: row.organic_preference ?? row.prefer_organic ?? "I dont care",
    preferNationalBrands: row.brand_preference ?? row.prefer_national_brands ?? "No preference",
  };

  return {
    basicInformation,
    householdSetup,
    cookingPreferences,
    dietaryProfile,
    shoppingPreferences,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      client?: any;
      generate?: any;
    };

    const clientIn = body.client || {};

    // 1) Identify the signed-in user from Supabase auth cookie (SSR anon client)
    const supa = createServerClient();
    const { data: userData } = await supa.auth.getUser().catch(() => ({ data: null as any }));
    const authUser = userData?.user;

    // Prefer IDs from auth; also accept any client-sent hint in extra
    const userId: string | undefined = clientIn?.extra?.userId || authUser?.id || undefined;
    let email: string =
      (clientIn?.basicInformation?.email || "").trim() ||
      (authUser?.email || authUser?.user_metadata?.email || "").trim();

    // 2) Fetch the profile row from your Supabase table using SERVICE ROLE
    let row: any = null;
    if (userId) {
      const { data } = await admin.from(PROFILE_TABLE).select("*").eq("user_id", userId).limit(1);
      row = data?.[0] ?? null;
    }
    if (!row && email) {
      const { data } = await admin.from(PROFILE_TABLE).select("*").eq("email", email).limit(1);
      row = data?.[0] ?? null;
    }

    // 3) Map DB row and derive names if needed
    const fromDb = rowToClient(row);
    if (!email && (fromDb as any)?.basicInformation?.email) {
      email = (fromDb as any).basicInformation.email;
    }
    const derived = namesFromEmail(email);

    // 4) Build final client payload (client values win)
    const client = {
      ...clientIn,
      basicInformation: merge(clientIn.basicInformation, {
        ...(fromDb as any).basicInformation,
        email,
        firstName:
          clientIn?.basicInformation?.firstName ||
          (fromDb as any)?.basicInformation?.firstName ||
          derived.firstName ||
          "",
        lastName:
          clientIn?.basicInformation?.lastName ||
          (fromDb as any)?.basicInformation?.lastName ||
          derived.lastName ||
          "",
      }),
      householdSetup: merge(clientIn.householdSetup, (fromDb as any).householdSetup),
      cookingPreferences: merge(clientIn.cookingPreferences, (fromDb as any).cookingPreferences),
      dietaryProfile: merge(clientIn.dietaryProfile, (fromDb as any).dietaryProfile),
      shoppingPreferences: merge(clientIn.shoppingPreferences, (fromDb as any).shoppingPreferences),
    };

    // 5) Forward to n8n
    if (!N8N_WEBHOOK_URL) {
      return NextResponse.json({ ok: false, error: "N8N_WEBHOOK_URL is not set" }, { status: 500 });
    }
    const correlationId = crypto.randomUUID();
    const callbackUrl = buildCallbackUrl();

    const forwardBody = {
      client,
      generate: body.generate || { menus: true, heroImages: true, menuCards: true, receipt: true },
      correlationId,
      callbackUrl,
    };

    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(forwardBody),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `n8n error ${res.status}`, details: txt?.slice(0, 2000) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, correlationId }, { status: 202 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
