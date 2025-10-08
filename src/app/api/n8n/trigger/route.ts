// src/app/api/n8n/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import crypto from "crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// If you already have a server helper that can read the auth cookie (anon client), use it:
import { createClient as createServerClient } from "@/lib/supabase/server"; // <— your existing wrapper

// ---------------- ENV ----------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // required (Server only)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;

const admin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------- TYPES ----------------
type Basic = {
  firstName: string;
  lastName: string;
  email: string;
  accountAddress?: { street?: string; city?: string; state?: string; zipcode?: string };
};

type ClientPayload = {
  basicInformation?: Partial<Basic>;
  householdSetup?: any;
  cookingPreferences?: any;
  dietaryProfile?: any;
  shoppingPreferences?: any;
  extra?: any;
};

type Incoming = {
  client?: ClientPayload;
  generate?: any;
};

// ---------------- HELPERS ----------------
const TABLES = ["profiles", "client_profiles", "ic_accounts", "accounts", "users"]; // keep only the one you use if you prefer

function buildCallbackUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (explicit) return `${explicit}/api/n8n/callback`;
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  return `${proto}://${host}/api/n8n/callback`;
}

function merge<A extends object, B extends object>(a?: A, b?: B) {
  // a (incoming client) wins; b (DB) fills gaps
  return { ...(b || {}), ...(a || {}) };
}

function splitCSV(v?: string) {
  return (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function namesFromEmail(email?: string) {
  const handle = (email || "").split("@")[0] || "";
  const cleaned = handle.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return { firstName: "", lastName: "" };
  const p = cleaned.split(/\s+/);
  return p.length === 1 ? { firstName: p[0], lastName: "" } : { firstName: p[0], lastName: p.slice(1).join(" ") };
}

function mapRowToClient(row: any): Partial<ClientPayload> {
  if (!row) return {};

  const firstName = row.first_name ?? row.firstName ?? row.given_name ?? "";
  const lastName = row.last_name ?? row.lastName ?? row.family_name ?? "";
  const email = row.email ?? row.user_email ?? "";
  
  const address =
    row.address || {
      street: row.address_street ?? row.street ?? "",
      city: row.address_city ?? row.city ?? "",
      state: row.address_state ?? row.state ?? "",
      zipcode: row.address_zipcode ?? row.zip ?? row.zipcode ?? "",
    };

  const basicInformation: Partial<Basic> = {
    firstName,
    lastName,
    email,
    accountAddress: {
      street: address?.street ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      zipcode: address?.zipcode ?? "",
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
    preferOrganic: row.organic_preference ?? row.prefer_organic ?? "",
    preferNationalBrands: row.brand_preference ?? row.prefer_national_brands ?? "",
  };

  return { basicInformation, householdSetup, cookingPreferences, dietaryProfile, shoppingPreferences };
}

async function fetchProfileBy({ userId, email }: { userId?: string; email?: string }) {
  for (const table of TABLES) {
    try {
      if (userId) {
        const { data, error } = await admin.from(table).select("*").eq("user_id", userId).limit(1);
        if (!error && data?.length) return data[0];
      }
      if (email) {
        const { data, error } = await admin.from(table).select("*").eq("email", email).limit(1);
        if (!error && data?.length) return data[0];
      }
    } catch {
      // try next table
    }
  }
  return null;
}

// ---------------- ROUTE ----------------
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const incoming = (await req.json().catch(() => ({}))) as Incoming;
    const clientIn = incoming.client || {};

    // 1) Get the authenticated user (from cookies) via your server anon client
    const server = createServerClient(cookies());
    const { data: userData } = await server.auth.getUser().catch(() => ({ data: null as any }));
    const authUser = userData?.user;

    // Candidate identifiers
    const userId: string | undefined =
      (clientIn as any)?.extra?.userId ||
      authUser?.id ||
      undefined;

    let email: string =
      (clientIn.basicInformation?.email || "").trim() ||
      (authUser?.email || authUser?.user_metadata?.email || "").trim();

    // 2) Pull profile row by userId/email using Service Role
    const row = await fetchProfileBy({ userId, email });

    // 3) Map DB row to our pieces and derive names if still missing
    const fromDb = mapRowToClient(row);

    if (!email && (fromDb.basicInformation?.email || (row as any)?.email)) {
      email = (fromDb.basicInformation?.email || (row as any)?.email || "").trim();
    }
    const derived = namesFromEmail(email);

    const basicMerged: Partial<Basic> = {
      email,
      firstName: (clientIn.basicInformation?.firstName ||
        fromDb.basicInformation?.firstName ||
        derived.firstName ||
        "").trim(),
      lastName: (clientIn.basicInformation?.lastName ||
        fromDb.basicInformation?.lastName ||
        derived.lastName ||
        "").trim(),
    };

    // 4) Final client = clientIn wins, DB fills gaps
    const client: ClientPayload = {
      ...clientIn,
      basicInformation: merge(clientIn.basicInformation, { ...fromDb.basicInformation, ...basicMerged }),
      householdSetup: merge(clientIn.householdSetup, fromDb.householdSetup),
      cookingPreferences: merge(clientIn.cookingPreferences, fromDb.cookingPreferences),
      dietaryProfile: merge(clientIn.dietaryProfile, fromDb.dietaryProfile),
      shoppingPreferences: merge(clientIn.shoppingPreferences, fromDb.shoppingPreferences),
    };

    // 5) Forward to n8n
    if (!N8N_WEBHOOK_URL) {
      return NextResponse.json({ ok: false, error: "N8N_WEBHOOK_URL is not set" }, { status: 500 });
    }

    const correlationId = crypto.randomUUID();
    const callbackUrl = buildCallbackUrl();

    const payload = {
      client,
      generate: incoming.generate || { menus: true, heroImages: true, menuCards: true, receipt: true },
      correlationId,
      callbackUrl,
    };

    const f = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!f.ok) {
      const text = await f.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `n8n error ${f.status}`, details: text?.slice(0, 2000) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, correlationId }, { status: 202 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
