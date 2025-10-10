// src/app/api/callback/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Ingredient = { name: string; qty: number; measure: string; estPrice?: number };
type MenuItem = {
  id: string;
  title: string;
  description: string;
  hero: string;
  ingredients: Ingredient[];
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // n8n should send something like:
    // { user_id, correlation_id, menus: MenuItem[] }
    const { user_id, correlation_id, menus } = body;

    if (!user_id || !Array.isArray(menus)) {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
    }

    // create new order (or upsert by correlation_id if you reuse it)
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([{ user_id, correlation_id: correlation_id ?? null, menus }])
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, order_id: data.id });
  } catch (e: any) {
    console.error('callback error', e);
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
