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
      crypto.createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 32);

    // If you have a public base URL, use it. Otherwise derive from request host.
    const host = req.headers.get("host");
    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
    const baseUrl = baseUrlEnv || (host ? `https://${host}` : "");

    const payload = {
      // marker so you can spot the new path inside n8n
      _source: "next-api-n8n-trigger-v2",
      _ts: new Date().toISOString(),

      correlationId,
      ...(baseUrl
        ? { callbackUrl: `${baseUrl}/api/n8n/callback?cid=${encodeURIComponent(correlationId)}` }
        : {}),

      // everything the client sent (DashboardClient builds this from Supabase)
      ...body,
    };

    // ✅ Assert required fields BEFORE calling n8n
    const bi = payload?.client?.basicInformation || {};
    if (!bi?.firstName && !bi?.lastName && !bi?.email) {
      console.error("[/api/n8n/trigger] REJECT: basicInformation is empty", bi);
      return NextResponse.json(
        {
          error:
            "Missing profile data. The client must send client.basicInformation (firstName/lastName/email).",
          hint:
            "Make sure your page uses DashboardClient.generateMenus() and not a direct webhook.",
          received: { basicInformation: bi },
        },
        { status: 400 }
      );
    }

    console.log("[/api/n8n/trigger] OUTBOUND TO N8N (short)", {
      correlationId,
      firstName: bi.firstName,
      lastName: bi.lastName,
      email: bi.email,
      callbackUrl: payload.callbackUrl,
    });

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

    return NextResponse.json({ correlationId, status: "accepted" }, { status: 202 });
  } catch (e: any) {
    console.error("[/api/n8n/trigger] crash", e);
    return NextResponse.json({ error: e?.message || "bad request" }, { status: 400 });
  }
}
