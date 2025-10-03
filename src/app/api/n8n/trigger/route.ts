// app/api/n8n/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json(); // { client: {...}, generate: {...} }
  const correlationId = crypto.randomUUID();

  // we forward to your n8n webhook and include where to call us back
  const payload = {
    ...body,
    correlationId,
    callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/n8n/callback`
  };

  const res = await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    return NextResponse.json({ error: "n8n error" }, { status: 502 });
  }
  // tell the browser “we started!”
  return NextResponse.json({ correlationId, status: "accepted" }, { status: 202 });
}
