import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic'; // run on Node.js, not Edge

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.correlationId) {
    return NextResponse.json({ ok: false, error: 'Missing correlationId' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // You can map whatever your n8n flow returns here:
  // e.g. body.menus, body.heroImages, body.menuCards, body.receipt
  const update: Record<string, any> = {
    n8n_callback_payload: body,
    menus: body.menus ?? null,
    updated_at: new Date().toISOString(),
    status: body.error ? 'error' : 'completed',
  };

  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('correlation_id', body.correlationId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
