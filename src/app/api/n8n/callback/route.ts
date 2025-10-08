import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: Request) {
  try {
    const body = await req.json(); // whatever n8n posts back
    const { correlationId, status, menus } = body || {};

    if (correlationId) {
      await supabase
        .from('orders')
        .update({
          status: status ?? 'processed',
          menus: menus ?? null,
        })
        .eq('correlation_id', correlationId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('callback error', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
