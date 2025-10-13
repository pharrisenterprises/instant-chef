// src/app/api/callback/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Ingredient = { name: string; qty?: number; measure?: string; estPrice?: number };
type MenuItem = {
  id: string;
  title: string;
  description: string;
  hero: string;
  ingredients: Ingredient[];
  // keep raw for debugging/analytics if you like
  _source?: any;
};

function makeId() {
  try {
    // @ts-ignore
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Turn "a: 200 g | b: 1 piece | salt: 0.50 tsp" into [{name:"a", qty:200, measure:"g"}, ...]
function parseIngredients(line?: string): Ingredient[] {
  if (!line || typeof line !== 'string') return [];
  return line
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .map(chunk => {
      // "name: value measure" OR just "name"
      const [left, rightRaw] = chunk.split(':').map(x => x.trim());
      if (!rightRaw) return { name: left };
      // try to split first token as number
      const parts = rightRaw.split(/\s+/);
      const qty = Number(parts[0].replace(/[^0-9.]/g, ''));
      const measure = parts.slice(1).join(' ') || undefined;
      return Number.isFinite(qty)
        ? { name: left, qty, measure }
        : { name: left };
    });
}

// Accepts either "normalized" or "n8n results_rows" shape and returns MenuItem
function normalizeOne(raw: any): MenuItem {
  // already normalized?
  if (raw && raw.title && raw.hero) {
    return {
      id: raw.id || makeId(),
      title: raw.title,
      description: raw.description ?? '',
      hero: raw.hero,
      ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
      _source: raw,
    };
  }

  // results_rows shape from your screenshots
  const title =
    raw?.menu_title ??
    raw?.title ??
    'Menu';
  const description =
    raw?.menu_description ??
    raw?.description ??
    '';
  const hero =
    raw?.hero_image_url ??
    raw?.menu_card_url ??
    raw?.hero ??
    '';

  const ingredients =
    parseIngredients(raw?.ingredients_per_serving) ??
    [];

  return {
    id: makeId(),
    title,
    description,
    hero,
    ingredients,
    _source: raw,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Expected from n8n:
    // { user_id, correlation_id, menus: [...] }  where menus are "results_rows" objects
    let { user_id, correlation_id, menus } = body || {};

    // Be forgiving: also accept alternative field names if they ever slip in
    user_id = user_id ?? body?.userId ?? body?.client_id ?? body?.email;
    menus = menus ?? body?.results_rows;

    // If menus came in stringified, try to parse
    if (typeof menus === 'string') {
      try { menus = JSON.parse(menus); } catch {}
    }

    if (!user_id || !Array.isArray(menus)) {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
    }

    // Normalize every menu row into the UI’s expected shape
    const normalized: MenuItem[] = menus.map(normalizeOne);

    // Try to insert the order; if a duplicate correlation_id exists, update that row instead.
    let orderId: string | null = null;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('orders')
      .insert([{
        user_id,
        correlation_id: correlation_id ?? null,
        menus: normalized,
        status: 'ready',
      }])
      .select('id')
      .single();

    if (insertErr) {
      // If duplicate (23505) or similar unique error on correlation_id, update instead
      const dup = typeof insertErr?.code === 'string' && insertErr.code === '23505';
      const looksDuplicate = dup || /duplicate key|unique/i.test(insertErr?.message ?? '');

      if (!looksDuplicate || !correlation_id) {
        throw insertErr;
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('orders')
        .update({
          menus: normalized,
          status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('correlation_id', correlation_id)
        .select('id')
        .single();

      if (updateErr || !updated) throw updateErr ?? new Error('Failed to update existing order');
      orderId = updated.id;
    } else {
      orderId = inserted?.id ?? null;
    }

    if (!orderId) {
      return NextResponse.json({ error: 'No order id' }, { status: 500 });
    }

    // ---- Persist each menu in public.menus (idempotent) ----
    // Make sure your `menus` table has columns used below or adjust the mapping.
    // Recommended: add a unique index on menu_key.
    const rows = normalized.map((m, idx) => ({
      order_id: orderId,
      user_id,
      title: m.title,
      description: m.description,
      hero: m.hero || null,
      portions: 2,
      approved: false,
      feedback: null,
      ingredients: m.ingredients ?? [],
      menu_key: `${orderId}:${idx}`, // <-- unique, stable key per order/menu
    }));

    if (rows.length) {
      await supabaseAdmin
        .from('menus')
        .upsert(rows, { onConflict: 'menu_key' });
    }

    return NextResponse.json({ ok: true, order_id: orderId, menus_count: rows.length });
  } catch (e: any) {
    console.error('callback error', e);
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
