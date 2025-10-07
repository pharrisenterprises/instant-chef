import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

// naive in-memory store (works for a single server process)
const STORE = globalThis as unknown as {
  __IC_RESULTS?: Map<string, any>;
};
if (!STORE.__IC_RESULTS) STORE.__IC_RESULTS = new Map<string, any>();

/**
 * n8n will POST results here using the callbackUrl you sent in /trigger.
 * Your front-end polls this route with GET to check status.
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const cid = url.searchParams.get("cid") || (await req.json().then(j => j?.correlationId).catch(() => null));
    if (!cid) return NextResponse.json({ error: "missing correlation id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    STORE.__IC_RESULTS!.set(cid, { ok: true, status: "done", result: body });
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
  if (!val) return new NextResponse("", { status: 204 }); // not ready yet
  return NextResponse.json(val);
}
