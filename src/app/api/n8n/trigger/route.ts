// src/app/api/n8n/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server"; // existing helper
import crypto from "crypto";

type BasicInfo = {
  firstName: string;
  lastName: string;
  email: string;
};

type ClientPayload = {
  basicInformation?: Partial<BasicInfo>;
  [k: string]: any; // rest of client shape
};

function splitName(full: string | null | undefined) {
  const safe = (full ?? "").trim();
  if (!safe) return { firstName: "", lastName: "" };
  const parts = safe.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function namesFromEmail(email?: string) {
  if (!email) return { firstName: "", lastName: "" };
  const handle = email.split("@")[0] ?? "";
  const clean = handle.replace(/[._-]+/g, " ").trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function coerceBasicInfo(input?: Partial<BasicInfo>, userMeta?: { email?: string; full_name?: string }) {
  const email = (input?.email || userMeta?.email || "").trim();
  let firstName = (input?.firstName || "").trim();
  let lastName = (input?.lastName || "").trim();

  if (!firstName && !lastName && userMeta?.full_name) {
    const s = splitName(userMeta.full_name);
    firstName = s.firstName;
    lastName = s.lastName;
  }
  if ((!firstName || !lastName) && email) {
    const s = namesFromEmail(email);
    if (!firstName) firstName = s.firstName;
    if (!lastName) lastName = s.lastName;
  }

  return { firstName, lastName, email };
}

function buildCallbackUrl(req: NextRequest) {
  // Prefer explicit env; otherwise reconstruct from headers on Vercel/Next
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return `${explicit.replace(/\/+$/, "")}/api/n8n/callback`;

  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) throw new Error("Missing host header to build callbackUrl");
  return `${proto}://${host}/api/n8n/callback`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { client?: ClientPayload };
    if (!body?.client) {
      return NextResponse.json({ ok: false, error: "Missing 'client' in request body." }, { status: 400 });
    }

    // Try to enrich from Supabase auth
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: null as any }));
    const user = userData?.user;
    const userMeta = {
      email: user?.email ?? user?.user_metadata?.email,
      full_name: user?.user_metadata?.full_name,
    };

    // Coerce basic info
    const basic = coerceBasicInfo(body.client.basicInformation, userMeta);

    if (!basic.email) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing profile data. Provide at least client.basicInformation.email or sign in. (We can derive names automatically.)",
        },
        { status: 400 },
      );
    }

    // Stamp the coerced profile back into payload so n8n always receives it
    body.client.basicInformation = basic;

    // Correlation id + callback
    const correlationId = crypto.randomUUID();
    const callbackUrl = buildCallbackUrl(req);

    // Forward to n8n
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      return NextResponse.json(
        { ok: false, error: "Server misconfiguration: N8N_WEBHOOK_URL is not set." },
        { status: 500 },
      );
    }

    const res = await fetch(n8nUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        correlationId,
        callbackUrl,
        client: body.client,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `n8n webhook failed (${res.status})`, details: text?.slice(0, 2000) },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, correlationId }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
