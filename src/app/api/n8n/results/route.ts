import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");
  if (!cid) return NextResponse.json({ error: "missing cid" }, { status: 400 });

  // const data = await kv.get(`n8n:${cid}`);
  const data = null; // replace with actual fetch

  if (!data) return NextResponse.json({ status: "pending" });
  return NextResponse.json(data);
}
