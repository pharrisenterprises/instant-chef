// app/api/n8n/callback/route.ts
import { NextRequest } from 'next/server'
import { createServer } from '@/lib/supabase/server' // uses service role key

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = process.env.IC_WEBHOOK_SECRET
  const got = req.headers.get('x-ic-webhook-secret')
  if (secret && got !== secret) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })

  const supabase = createServer()
  const payload = await req.json() as {
    orderId: string,
    menus: Array<{ id: string; title: string; description: string; hero: string; portions?: number; approved?: boolean; ingredients?: any[]; steps?: string[] }>
  }

  // Convert base64 hero images to public URLs
  const processed = []
  for (const m of payload.menus) {
    if (typeof m.hero === 'string' && m.hero.startsWith('data:image/')) {
      const [meta, data] = m.hero.split(',', 2)
      const ext = (meta.match(/^data:image\/([^;]+)/)?.[1] ?? 'jpg').toLowerCase()
      const bytes = Buffer.from(data, 'base64')
      const path = `orders/${payload.orderId}/${m.id}.${ext}`

      const up = await supabase.storage.from('heroes').upload(path, bytes, {
        contentType: `image/${ext}`,
        upsert: true,
      })
      if (up.error) {
        console.error(up.error)
        return new Response(JSON.stringify({ ok: false, error: up.error.message }), { status: 500 })
      }
      const { data: pub } = supabase.storage.from('heroes').getPublicUrl(path)
      m.hero = pub.publicUrl
    }
    processed.push(m)
  }

  const { error } = await supabase.from('orders').update({ menus: processed }).eq('id', payload.orderId)
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
