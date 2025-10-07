import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: "N8N_WEBHOOK_URL not set" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));

    const correlationId =
      body?.correlationId ||
      crypto
        .createHash("sha256")
        .update(`${Date.now()}-${Math.random()}`)
        .digest("hex")
        .slice(0, 32);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "";

    // Merge defaults defensively (in case client omitted pieces)
    const client = body.client || {};
    const basicInformation = client.basicInformation || {
      firstName: "",
      lastName: "",
      email: "",
      accountAddress: { street: "", city: "", state: "", zipcode: "" },
    };
    const householdSetup = client.householdSetup || {
      adults: 0,
      teens: 0,
      children: 0,
      toddlersInfants: 0,
      portionsPerDinner: 4,
      dinnersPerWeek: 4,
    };
    const cookingPreferences = client.cookingPreferences || {
      cookingSkill: "Beginner",
      cookingTimePreference: "30 min",
      equipment: [],
    };
    const dietaryProfile = client.dietaryProfile || {
      allergiesRestrictions: [],
      dislikesAvoidList: [],
      dietaryPrograms: [],
    };
    const shoppingPreferences = client.shoppingPreferences || {
      storesNearMe: [],
      preferredGroceryStore: "",
      preferOrganic: "I dont care",
      preferNationalBrands: "No preference",
    };

    const payload = {
      correlationId,
      callbackUrl: `${baseUrl}/api/n8n/callback?cid=${encodeURIComponent(correlationId)}`,
      client: {
        basicInformation,
        householdSetup,
        cookingPreferences,
        dietaryProfile,
        shoppingPreferences,
        extra: client.extra ?? {},
      },
      weeklyPlan: body.weeklyPlan ?? {},
      pantrySnapshot: body.pantrySnapshot ?? [],
      barSnapshot: body.barSnapshot ?? [],
      currentMenusCount: body.currentMenusCount ?? 0,
      generate: body.generate ?? {
        menus: true,
        heroImages: true,
        menuCards: true,
        receipt: true,
      },
    };

    console.log("[trigger → n8n]", JSON.stringify(payload, null, 2).slice(0, 800));

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[/api/n8n/trigger] n8n error", res.status, text?.slice(0, 600));
      return NextResponse.json(
        { error: "n8n rejected", status: res.status, details: text?.slice(0, 600) ?? "" },
        { status: 502 }
      );
    }

    console.log("[/api/n8n/trigger] accepted", { correlationId });
    return NextResponse.json({ correlationId, status: "accepted" }, { status: 202 });
  } catch (e: any) {
    console.error("[/api/n8n/trigger] crash", e);
    return NextResponse.json({ error: e?.message || "bad request" }, { status: 400 });
  }
}
