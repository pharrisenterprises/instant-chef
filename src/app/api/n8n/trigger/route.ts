// Runtime: Next.js App Router API Route
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ----- TYPES your n8n flow expects -----
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

// ----- ENV / SUPABASE -----
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;

const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ----- HELPERS -----
function buildCallbackUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (explicit) return `${explicit}/api/n8n/callback`;
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  return `${proto}://${host}/api/n8n/callback`;
}

function merge<A extends object, B extends object>(a?: A, b?: B) {
  // caller (a) wins; DB (b) fills blanks
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

// Normalize *whatever* row shape you have into the structure n8n expects
function rowToClientParts(row: any): Partial<ClientPayload> {
  if (!row) return {};

  // Try several common field names; adjust if your columns differ
  const firstName = row.first_name ?? row.firstName ?? row.given_name ?? "";
  const lastName = row.last_name ?? row.lastName ?? row.family_name ?? "";
  const email = row.email ?? row.user_email ?? "";

  // address may be nested or flat
  const address =
    row.address ||
    {
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
    preferOrganic: row.organic_preference ?? row.prefer_organic ?? "I dont care",
    preferNationalBrands: row.brand_preference ?? row.prefer_national_brands ?? "No preference",
  };

  return { basicInformation, householdSetup, cookingPreferences, dietaryProfile, shoppingPreferences };
}

// Try to fetch a profile row by user_id or email from any of these common tables.
// Keep the table you actually use; this makes it work even if you’ve renamed it in older branches.
const CANDIDATE_TABLES = [
  "profiles",
  "client_profiles",
  "accounts",
  "ic_accounts",
  "users",
];

async function fetchProfileRow({ userId, email }: { userId?: string; email?: string }) {
  for (const table of CANDIDATE_TABLES) {
    try {
      let q = sbAdmin.from(table).select("*").limit(1);

      if (userId && "user_id" in (await q.clone().select("user_id").abortSignal(new AbortController().signal))) {
        const { data, error } = await sbAdmin.from(table).select("*").eq("user_id", userId).limit(1);
        if (!error && data && data.length) return { row: data[0], table };
      }

      if (email) {
        const { data, error } = await sbAdmin.from(table).select("*").eq("email", email).limit(1);
        if (!error && data && data.length) return { row: data[0], table };
      }
    } catch {
      // ignore and try next table
    }
  }
  return { row: null as any, table: null as any };
}

// ----- ROUTE -----
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const incoming = (await req.json().catch(() => ({}))) as { client?: ClientPayload; generate?: any };
    const clientIn = incoming.client || {};

    // 1) Identify user/email from the body first, then from your DB (service role can query session tables if you store them)
    let email = (clientIn.basicInformation?.email || "").trim();

    // If email is still empty, try to infer from any DB row keyed by user_id you might be sending in 'extra'
    let userId = (clientIn as any)?.extra?.userId || (clientIn as any)?.userId || undefined;

    // 2) Pull the row from Supabase (by user_id or email)
    const { row } = await fetchProfileRow({ userId, email });

    // 3) Map DB row to your client parts & derive names if needed
    const fromDb = rowToClientParts(row);

    // If we still don't have an email, try to take it from DB row now
    if (!email && (fromDb.basicInformation?.email || row?.email)) {
      email = (fromDb.basicInformation?.email || row?.email || "").trim();
    }

    // Derive names from email if missing
    const derived = namesFromEmail(email);
    const basic: Partial<Basic> = {
      email,
      firstName: (clientIn.basicInformation?.firstName || fromDb.basicInformation?.firstName || derived.firstName || "").trim(),
      lastName: (clientIn.basicInformation?.lastName || fromDb.basicInformation?.lastName || derived.lastName || "").trim(),
    };

    // 4) Build final client payload: client wins, DB fills blanks
    const client: ClientPayload = {
      ...clientIn,
      basicInformation: merge(clientIn.basicInformation, { ...fromDb.basicInformation, ...basic }),
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

    const forward = {
      client,
      generate: incoming.generate || { menus: true, heroImages: true, menuCards: true, receipt: true },
      correlationId,
      callbackUrl,
    };

    const f = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(forward),
    });

    if (!f.ok) {
      const text = await f.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `n8n error ${f.status}`, details: text?.slice(0, 2000) },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, correlationId }, { status: 202 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
