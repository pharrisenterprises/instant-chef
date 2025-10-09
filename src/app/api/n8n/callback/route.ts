// app/api/n8n/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const runtime = 'nodejs'; // important for admin client

// Use admin client (service role)
const supabase = createSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // set this in Vercel Project → Settings → Environment Variables
  { auth: { persistSession: false } }
);

type IncomingItem = {
  orderId: string;
  correlationId?: string;
  menu?: {
    id: string;
    title: string;
    description?: string;
    hero?: string | null;     // public URL from Drive/Imagen
    approved?: boolean;
    ingredients?: any[];      // keep as JSON
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: IncomingItem[] = Array.isArray(body) ? body : [body];

    // Basic sanity
    if (!items.length) {
      return NextResponse.json({ ok: false, error: 'Empty payload' }, { status: 400 });
    }

    for (const item of items) {
      if (!item?.orderId || !item?.menu) continue;

      const { orderId, correlationId, menu } = item;

      // optional: make sure order exists
      const { data: orderRow, error: orderErr } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .single();
      if (orderErr) throw orderErr;

      // upsert menu row
      const upsert = {
        id: menu.id,                 // deterministic slug you created in n8n "Set" node
        order_id: orderId,           // FK
        title: menu.title,
        description: menu.description ?? null,
        hero: menu.hero ?? null,     // URL
        approved: menu.approved ?? false,
        ingredients: menu.ingredients ?? [],
        correlation_id: correlationId ?? null,
      };

      const { error: menuErr } = await supabase
        .from('menus')
        .upsert(upsert, { onConflict: 'id' });
      if (menuErr) throw menuErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('n8n callback error:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
