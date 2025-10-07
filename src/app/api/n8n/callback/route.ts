import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // <- prevent caching on Vercel

const STORE = globalThis as unknown as { __IC_RESULTS?: Map<string, any> };
if (!STORE.__IC_RESULTS) STORE.__IC_RESULTS = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const cidUrl = url.searchParams.get("cid");
    const body = await req.json().catch(() => ({}));
    const cid = cidUrl || body?.correlationId;
    if (!cid) return NextResponse.json({ error: "missing correlation id" }, { status: 400 });

    STORE.__IC_RESULTS!.set(cid, { ok: true, status: "done", result: body });
    console.log("[/api/n8n/callback] stored", cid);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "bad request" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cid = url.searchParams.get("cid");
  if (!cid) return NextResponse.json({ error: "missing correlation id" }, { status: 400 });

  const val = STORE.__IC_RESULTS!.get(cid);
  if (!val) return new NextResponse("", { status: 204 });
  return NextResponse.json(val);
}
