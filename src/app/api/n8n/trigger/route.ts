// app/api/n8n/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

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

function splitName(full?: string) {
  const s = (full || "").trim();
  if (!s) return { firstName: "", lastName: "" };
  const p = s.split(/\s+/);
  return p.length === 1 ? { firstName: p[0], lastName: "" } : { firstName: p[0], lastName: p.slice(1).join(" ") };
}
function namesFromEmail(email?: string) {
  const handle = (email || "").split("@")[0] || "";
  const cleaned = handle.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return { firstName: "", lastName: "" };
  const p = cleaned.split(/\s+/);
  return p.length === 1 ? { firstName: p[0], lastName: "" } : { firstName: p[0], lastName: p.slice(1).join(" ") };
}
function buildCallbackUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (explicit) return `${explicit}/api/n8n/callback`;
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) throw new Error("Cannot build callbackUrl: missing host");
  return `${proto}://${host}/api/n8n/callback`;
}
function merge<A extends object, B extends object>(a?: A, b?: B) {
  return { ...(b || {}), ...(a || {}) };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { client?: ClientPayload; generate?: any };
    const clientIn = body?.client || {};

    // Try to enrich from Supabase auth
    const supa = createClient(cookies());
    const { data: userData } = await supa.auth.getUser().catch(() => ({ data: null as any }));
    const user = userData?.user;

    const email =
      (clientIn.basicInformation?.email || "").trim() ||
      (user?.email || user?.user_metadata?.email || "").trim();

    // derive names
    let firstName = (clientIn.basicInformation?.firstName || "").trim();
    let lastName = (clientIn.basicInformation?.lastName || "").trim();

    if ((!firstName && !lastName) && user?.user_metadata?.full_name) {
      const s = splitName(user.user_metadata.full_name);
      firstName = s.firstName;
      lastName = s.lastName;
    }
    if ((!firstName || !lastName) && email) {
      const s = namesFromEmail(email);
      if (!firstName) firstName = s.firstName;
      if (!lastName) lastName = s.lastName;
    }

    // Final basicInformation (don’t fail if names are blank; only require email)
    const basicInformation: Basic = merge(clientIn.basicInformation, { email, firstName, lastName });

    if (!basicInformation.email) {
      // As a last resort, accept and let n8n decide; or return a friendly 200 with ok:false
      return NextResponse.json(
        { ok: false, error: "No email found. Please save your profile or sign in." },
        { status: 200 } // don’t throw 400 to keep UI flow calm
      );
    }

    const client: ClientPayload = { ...clientIn, basicInformation };

    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      return NextResponse.json({ ok: false, error: "N8N_WEBHOOK_URL is not set" }, { status: 500 });
    }

    const correlationId = crypto.randomUUID();
    const callbackUrl = buildCallbackUrl();

    const forwardBody = JSON.stringify({
      client,
      generate: body?.generate || { menus: true },
      correlationId,
      callbackUrl,
    });

    const f = await fetch(n8nUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: forwardBody,
    });

    if (!f.ok) {
      const txt = await f.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `n8n error ${f.status}`, details: txt?.slice(0, 2000) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, correlationId }, { status: 202 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown server error" }, { status: 500 });
  }
}
