import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 🔥 Adjust query as needed; right now it fetches Patrick's row
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "email, first_name, last_name, account_street, account_city, account_state, account_zipcode, adults, teens, children, toddlers, portions_per_dinner, dinners_per_week, cooking_skill, cooking_time, equipment, allergies, dislikes, dietary_programs, preferred_store, organic_preference, brand_preference"
      )
      .eq("email", "pharrisenterprises@gmail.com")
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("Profile fetch error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
