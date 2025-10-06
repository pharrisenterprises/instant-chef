import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!webhookUrl) {
      console.error("[trigger] N8N_WEBHOOK_URL missing");
      return NextResponse.json({ error: "N8N_WEBHOOK_URL not set" }, { status: 500 });
    }
    if (!baseUrl) {
      console.error("[trigger] NEXT_PUBLIC_BASE_URL missing");
      return NextResponse.json({ error: "NEXT_PUBLIC_BASE_URL not set" }, { status: 500 });
    }

    const correlationId = crypto.randomUUID();
    const callbackUrl = `${baseUrl}/api/n8n/callback`;

    const payload = { ...body, correlationId, callbackUrl };
    console.log("[trigger] → n8n", { webhookUrl, correlationId, callbackUrl });

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      console.error("[trigger] n8n non-OK", res.status, text?.slice(0, 300));
      return NextResponse.json(
        { error: "n8n rejected", status: res.status, details: text?.slice(0, 300) ?? "" },
        { status: 502 }
      );
    }

    return NextResponse.json({ correlationId, status: "accepted" }, { status: 202 });
  } catch (e: any) {
    console.error("[trigger] crash", e);
    return NextResponse.json({ error: e?.message || "bad request" }, { status: 400 });
  }
}
