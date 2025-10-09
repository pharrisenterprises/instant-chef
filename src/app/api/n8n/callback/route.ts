// app/api/n8n/callback/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// (optional) force dynamic so Vercel doesn't cache
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Optional: verify a shared secret so only n8n can call this
  const secret = process.env.IC_WEBHOOK_SECRET
  const got = req.headers.get('x-ic-webhook-secret')
  if (secret && got !== secret) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  }

  const payload = await req.json()
  const supabase = createClient()

  // Basic validation
  if (!payload?.orderId || !Array.isArray(payload?.menus)) {
    return new Response(JSON.stringify({ ok: false, error: 'bad payload' }), { status: 400 })
  }

  // Save menus onto the order row (or into your own menus table)
  const { error } = await supabase
    .from('orders')
    .update({ menus: payload.menus })
    .eq('id', payload.orderId)

  if (error) {
    console.error(error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
