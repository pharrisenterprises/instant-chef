// src/app/api/callback/route.ts

import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase/admin';



type Ingredient = { name: string; qty?: number; measure?: string; estPrice?: number };

type Nutrition = { calories?: number | null; est_cost_per_serving?: number | null };

type Recipe = { cook_time_min?: number | null; steps?: string[] };

type Side = { title?: string; ingredients?: Ingredient[]; steps?: string[] };

type MenuItem = {

  id: string;

  title: string;

  description: string;

  hero: string;

  ingredients: Ingredient[];

  nutrition?: Nutrition;   // â¬…ï¸ NEW

  recipe?: Recipe;         // â¬…ï¸ NEW

  sides?: Side[];  
  instructions?: string[];
  recipe_steps?: string | null;

  _source?: any;

};



function makeId() {

  try {

    // @ts-ignore

    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  } catch {}

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

}



// "a: 200 g | b: 1 piece | salt: 0.50 tsp" -> [{name:"a", qty:200, measure:"g"}, ...]

function parseIngredients(line?: string): Ingredient[] {

  if (!line || typeof line !== 'string') return [];

  return line

    .split('|')

    .map(s => s.trim())

    .filter(Boolean)

    .map(chunk => {

      const [left, rightRaw] = chunk.split(':').map(x => x.trim());

      if (!rightRaw) return { name: left };

      const parts = rightRaw.split(/\s+/);

      const qty = Number(parts[0].replace(/[^0-9.]/g, ''));

      const measure = parts.slice(1).join(' ') || undefined;

      return Number.isFinite(qty) ? { name: left, qty, measure } : { name: left };

    });

}

function parseSteps(raw?: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(step => String(step).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .replace(/\r/g, '\n')
      .split(/[\n\u2022]+/)
      .map(step => step.replace(/^\d+[)\.\s-]+/, '').trim())
      .filter(Boolean);
  }
  return [];
}




function splitSideSections(raw?: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(entry => String(entry).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    if (raw.includes('||')) {
      return raw.split('||').map(part => part.trim()).filter(Boolean);
    }
    if (raw.includes('\n\n')) {
      return raw.split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
    }
    return [raw.trim()];
  }
  return [];
}

function parseSides(raw: any): Side[] {
  if (Array.isArray(raw?.sides) && raw.sides.length) {
    return raw.sides as Side[];
  }
  const titles = splitSideSections(raw?.sides_titles ?? raw?.sidesTitles);
  const ingredientBlocks = splitSideSections(raw?.sides_ingredients_per_serving ?? raw?.sidesIngredientsPerServing);
  const stepBlocks = splitSideSections(raw?.sides_steps ?? raw?.sidesSteps);
  const max = Math.max(titles.length, ingredientBlocks.length, stepBlocks.length);
  const sides: Side[] = [];
  for (let i = 0; i < max; i += 1) {
    const titleCandidate = titles[i] ?? (max > 1 ? `Side ${i + 1}` : titles[0] ?? '');
    const title = titleCandidate?.trim() || `Side ${i + 1}`;
    const ingredients = parseIngredients(ingredientBlocks[i]);
    const steps = parseSteps(stepBlocks[i]);
    if (title || ingredients.length || steps.length) {
      sides.push({
        title,
        ingredients,
        steps,
      });
    }
  }
  return sides;
}

// Accepts either "normalized" or "n8n results_rows" shape and returns MenuItem

function normalizeOne(raw: any): MenuItem {

  if (raw && raw.title && raw.hero) {

    return {

      id: raw.id || makeId(),

      title: raw.title,

      description: raw.description ?? '',

      hero: raw.hero,

      ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],

      instructions: parseSteps(raw.instructions ?? raw.recipe_steps ?? raw.recipeSteps),

      recipe_steps: typeof raw.recipe_steps === 'string'

        ? raw.recipe_steps

        : typeof raw.recipeSteps === 'string'

        ? raw.recipeSteps

        : null,

      sides: parseSides(raw),

      _source: raw,

    };

  }



  const title = raw?.menu_title ?? raw?.title ?? 'Menu';

  const description = raw?.menu_description ?? raw?.description ?? '';

  const hero = raw?.hero_image_url ?? raw?.menu_card_url ?? raw?.hero ?? '';

  const ingredients = parseIngredients(raw?.ingredients_per_serving) ?? [];

  const recipeSteps = raw?.recipe_steps ?? raw?.recipeSteps ?? null;



  return {

    id: makeId(),

    title,

    description,

    hero,

    ingredients,

    instructions: parseSteps(recipeSteps ?? raw?.instructions),

    recipe_steps: typeof recipeSteps === 'string' ? recipeSteps : null,

    sides: parseSides(raw),

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



    // Normalize menus to UI shape

    const normalized: MenuItem[] = menus.map(normalizeOne);



    // Create one order row (keeps your existing behavior)

    const { data: orderRow, error: orderErr } = await supabaseAdmin

      .from('orders')

      .insert([{

        user_id,

        correlation_id: correlation_id ?? null,

        menus: normalized,

      }])

      .select('id')

      .single();



    if (orderErr) throw orderErr;

    const order_id = orderRow.id as string;



    // Also persist each menu into public.menus

    // We try with a `hero` column first (so you can store image URLs),

    // and if that column doesn't exist yet, we retry without it.

    const menuRowsWithHero = normalized.map((m) => ({

      id: m.id,

      correlation_id: correlation_id ?? null,

      order_id,

      title: m.title,

      description: m.description ?? '',

      hero: m.hero ?? '', // requires a text column named "hero" (recommended)

    }));



    let menusInsertError: any = null;



    // Attempt #1: with hero column

    const { error: menusErrWithHero } = await supabaseAdmin

      .from('menus')

      .insert(menuRowsWithHero);



    if (menusErrWithHero) {

      // Attempt #2: retry without hero (for schemas that don't have the column)

      const menuRowsNoHero = normalized.map((m) => ({

        id: m.id,

        correlation_id: correlation_id ?? null,

        order_id,

        title: m.title,

        description: m.description ?? '',

      }));

      const { error: menusErrNoHero } = await supabaseAdmin

        .from('menus')

        .insert(menuRowsNoHero);



      menusInsertError = menusErrNoHero;

    }



    if (menusInsertError) {

      // Donâ€™t fail the whole request if menus table insert fails;

      // still return success for the order row and include a note.

      console.warn('menus insert warning:', menusInsertError?.message ?? menusInsertError);

      return NextResponse.json({

        ok: true,

        order_id,

        menus_count: normalized.length,

        warning: 'Order saved, but menus table insert failed (check schema/columns).',

      });

    }



    return NextResponse.json({

      ok: true,

      order_id,

      menus_count: normalized.length,

    });

  } catch (e: any) {

    console.error('callback error', e);

    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });

  }

}
