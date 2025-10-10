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

    // Insert one order row with normalized menus
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([{
        user_id,
        correlation_id: correlation_id ?? null,
        menus: normalized,
      }])
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, order_id: data.id });
  } catch (e: any) {
    console.error('callback error', e);
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
