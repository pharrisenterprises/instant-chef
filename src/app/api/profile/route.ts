// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  // Fail fast at boot if env is missing (server logs will show this)
  console.error("[/api/profile] Missing Supabase env variables.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email")?.trim() || null;
    const userId =
      url.searchParams.get("user_id")?.trim() ||
      url.searchParams.get("id")?.trim() ||
      null;

    if (!email && !userId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing identifier. Provide ?email=<email> or ?user_id=<uuid> (or ?id=...).",
        },
        { status: 400 }
      );
    }

    // Build the base select once
    const selectCols =
      "email, first_name, last_name, account_street, account_city, account_state, account_zipcode, adults, teens, children, toddlers, portions_per_dinner, dinners_per_week, cooking_skill, cooking_time, equipment, allergies, dislikes, dietary_programs, preferred_store, organic_preference, brand_preference, stores_near_me";

    let query = supabase.from("profiles").select(selectCols);

    if (email) {
      query = query.eq("email", email);
    } else if (userId) {
      // Try common id column names in order of likelihood.
      // Adjust to your actual schema if needed.
      query = query.or(`id.eq.${userId},user_id.eq.${userId}`);
    }

    const { data, error } = await query.single();

    if (error) {
      // If Supabase says no rows, return 404 instead of 500
      if (error.code === "PGRST116" || /No rows/.test(error.message)) {
        return NextResponse.json(
          { ok: false, error: "Profile not found." },
          { status: 404 }
        );
      }
      throw error;
    }

    // No caching; always fresh
    const res = NextResponse.json({ ok: true, data }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: any) {
    console.error("[/api/profile] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
