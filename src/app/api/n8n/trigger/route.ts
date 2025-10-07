import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // <- prevent caching on Vercel

export async function POST(req: NextRequest) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("[/api/n8n/trigger] Missing N8N_WEBHOOK_URL");
      return NextResponse.json({ error: "N8N_WEBHOOK_URL not set" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const correlationId =
      body?.correlationId ||
      crypto.createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 32);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; // optional
    const payload = {
      correlationId,
      ...(baseUrl
        ? { callbackUrl: `${baseUrl.replace(/\/$/, "")}/api/n8n/callback?cid=${encodeURIComponent(correlationId)}` }
        : {}),
      ...body,
    };

    console.log("[/api/n8n/trigger] → n8n", { webhookUrl, correlationId });

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[/api/n8n/trigger] n8n error", res.status, text?.slice(0, 500));
      return NextResponse.json(
        { error: "n8n rejected", status: res.status, details: text?.slice(0, 500) ?? "" },
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
