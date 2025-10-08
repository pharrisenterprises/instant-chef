// src/app/api/n8n/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

// 1) make sure Next doesn't cache this route
export const dynamic = "force-dynamic"; // no static optimization

// 2) simple in-memory store (OK for local/testing)
const store: Map<string, any> =
  (globalThis as any).__IC_STORE__ || new Map<string, any>();
(globalThis as any).__IC_STORE__ = store;

// 3) if later you use Node-only APIs (crypto, fs), uncomment this:
// export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const cid = data?.correlationId;
  if (!cid) return NextResponse.json({ error: "missing correlationId" }, { status: 400 });

  store.set(cid, { status: "done", ...data });

  return NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" }
  });
}

// Helper: GET /api/n8n/callback?cid=...
export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");
  if (!cid) return NextResponse.json({ error: "missing cid" }, { status: 400 });

  const data = store.get(cid) ?? { status: "pending" };
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" }
  });
}
