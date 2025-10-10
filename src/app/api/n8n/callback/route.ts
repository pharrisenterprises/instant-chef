// src/app/api/callback/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// If n8n calls this route (no user cookies), use service role to update orders.
const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // keep secret in Vercel env
  { auth: { persistSession: false } }
);

type N8NRow = {
  menu_label?: string;
  menu_title: string;
  menu_description: string;
  hero_url?: string;         // optional direct URL from n8n
  hero_base64?: string;      // optional "data:image/jpeg;base64,...."
  ingredients_per_serving?: string; // e.g. "Chicken thighs: 200 g | roma tomatoes: 1 ..."
};

type Ingredient = { name: string; qty: number; measure: 'oz'|'lb'|'ml'|'g'|'kg'|'count'; estPrice?: number };

// naive parser: "name: qty unit" or "name: X" → count
function parseIngredients(s?: string): Ingredient[] {
  if (!s) return [];
  return s
    .split('|')
    .map(t => t.trim())
    .filter(Boolean)
    .map((row) => {
      // Try to match "name: qty unit"
      const m = row.match(/^(.+?):\s*([\d.]+)\s*(\w+)?/i);
      if (m) {
        const name = m[1].trim();
        const qty = Number(m[2]);
        const unit = (m[3]?.toLowerCase() || 'count') as Ingredient['measure'];
        return { name, qty: Number.isFinite(qty) ? qty : 1, measure: unit };
      }
      // fallback: just a name
      return { name: row, qty: 1, measure: 'count' as const };
    });
}

async function storeHero(orderId: string, idx: number, row: N8NRow): Promise<string> {
  // Prefer provided URL
  if (row.hero_url) return row.hero_url;

  if (row.hero_base64?.startsWith('data:')) {
    // Strip "data:*;base64,"
    const b64 = row.hero_base64.split(',').pop()!;
    const bytes = Buffer.from(b64, 'base64');
    const path = `${orderId}/${Date.now()}-${idx}.jpg`;

    const { error: upErr } = await supabase
      .storage.from('menu-heroes')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

    if (!upErr) {
      const { data: pub } = supabase.storage.from('menu-heroes').getPublicUrl(path);
      return pub.publicUrl;
    }
  }

  // Safe fallback
  return '/hero.jpg';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, results_rows } = body as { orderId?: string; results_rows?: N8NRow[] };

    if (!orderId || !Array.isArray(results_rows)) {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });
    }

    // Optional: confirm order exists (also gives you default portions if you store it)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    // Build MenuItem[] for your UI
    const menus = await Promise.all(
      results_rows.map(async (r, idx) => {
        const hero = await storeHero(orderId, idx, r);

        return {
          id: crypto.randomUUID(),
          title: r.menu_title,
          description: r.menu_description,
          hero,
          portions: 4,          // or pull from order/user profile if you store it
          approved: false,
          ingredients: parseIngredients(r.ingredients_per_serving),
        };
      })
    );

    // Save into orders.menus (JSONB)
    const { error: upErr } = await supabase
      .from('orders')
      .update({ menus, status: 'menus_ready' })
      .eq('id', orderId);

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: menus.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
