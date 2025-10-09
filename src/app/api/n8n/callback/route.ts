// app/api/n8n/callback/route.ts
import { NextRequest } from 'next/server'
import { createServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type N8NMenu = {
  id: string
  title: string
  description: string
  hero: string
  portions?: number
  approved?: boolean
  ingredients?: any[]
  steps?: string[]
}

type ResultsRow = {
  menu_label: string
  menu_title: string
  menu_description: string
  hero_image_url?: string
  menu_card_url?: string
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export async function POST(req: NextRequest) {
  const secret = process.env.IC_WEBHOOK_SECRET
  const got = req.headers.get('x-ic-webhook-secret')
  if (secret && got !== secret) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  }

  const supabase = createServer()
  const payload = await req.json() as {
    orderId: string
    menus?: N8NMenu[]
    results_rows?: ResultsRow[]
  }

  // Build menus if caller only sent results_rows
  let menus: N8NMenu[] = Array.isArray(payload.menus) ? payload.menus : []
  if ((!menus || menus.length === 0) && Array.isArray(payload.results_rows)) {
    menus = payload.results_rows.map((r) => {
      const hero =
        r.hero_image_url?.trim() ||
        r.menu_card_url?.trim() ||
        '' // leave empty if none

      return {
        id: slug(r.menu_title || `menu-${r.menu_label || ''}`) || `menu-${r.menu_label || 'x'}`,
        title: r.menu_title ?? '',
        description: r.menu_description ?? '',
        hero,
        portions: 4,
        approved: false,
        ingredients: [],
        steps: [],
      }
    }).filter(m => m.title && m.hero) // only keep cards with a title + image
  }

  // If the heroes are data URLs we’ll upload; otherwise we leave the URLs as-is.
  const processed: N8NMenu[] = []
  for (const m of menus) {
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

  const { error } = await supabase
    .from('orders')
    .update({ menus: processed })
    .eq('id', payload.orderId)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, count: processed.length }), { status: 200 })
}
