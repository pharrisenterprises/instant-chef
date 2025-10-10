// app/api/n8n/callback/route.ts
import { NextRequest } from 'next/server'
import { createServer } from '@/lib/supabase/server' // service role

export const dynamic = 'force-dynamic'

type ResultsRow = {
  menu_label: string
  menu_title: string
  menu_description: string
  ingredients_per_serving?: string
  cook_time_min?: number
  sides_count?: number
  sides_titles?: string
  sides_ingredients_per_serving?: string
  sides_steps?: string
  est_cost_linear_per_serv?: number
  kcal?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  menu_card_url?: string
  hero_image_url?: string
}

type Menu = {
  id: string
  title: string
  description: string
  hero: string
  portions?: number
  approved?: boolean
  ingredients?: Array<{ name: string; qty: number; measure: string }>
  steps?: string[]
  // optional extras if you want to surface later
  cook_time_min?: number
  nutrition?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number }
  cost_per_serving?: number | null
}

function parseIngredients(line?: string) {
  // "chicken thighs: 225 g | roma tomatoes: 100 g | ..." → [{name, qty, measure}]
  if (!line) return []
  return line.split('|').map(part => {
    const p = part.trim()
    const [nameRaw, rest] = p.split(':').map(s => s.trim())
    const m = rest?.match(/^([\d.]+)\s*(\w+)$/) // qty + measure
    const qty = m ? Number(m[1]) : 0
    const measure = m ? m[2] : ''
    return { name: nameRaw, qty: Number.isFinite(qty) ? qty : 0, measure }
  })
}

function toSteps(from?: string) {
  if (!from) return undefined
  // support either "•" bullets or " || " separators just in case
  const raw = from.includes('•') ? from.split('•') : from.split('||')
  return raw.map(s => s.trim()).filter(Boolean)
}

function mapResultsToMenus(rows: ResultsRow[], defaultPortions = 4): Menu[] {
  return rows.map((r, idx) => {
    const hero =
      (r.menu_card_url?.trim() || r.hero_image_url?.trim() || '') // Cloudinary URL if present
    const id = `menu-${(r.menu_label || String.fromCharCode(65 + idx)).trim()}`
    return {
      id,
      title: r.menu_title,
      description: r.menu_description,
      hero, // can be a https URL; if data-URL, we upload below
      portions: defaultPortions,
      approved: false,
      ingredients: parseIngredients(r.ingredients_per_serving),
      steps: toSteps(r.sides_steps),
      cook_time_min: r.cook_time_min,
      nutrition: {
        calories: r.kcal,
        protein_g: r.protein_g,
        carbs_g: r.carbs_g,
        fat_g: r.fat_g,
      },
      cost_per_serving: r.est_cost_linear_per_serv ?? null,
    }
  })
}

export async function POST(req: NextRequest) {
  // 1) Secret
  const secret = process.env.IC_WEBHOOK_SECRET
  const got = req.headers.get('x-ic-webhook-secret')
  if (secret && got !== secret) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  }

  // 2) Read payload
  const body = await req.json().catch(() => null) as {
    orderId?: string
    menus?: Menu[]
    results_rows?: ResultsRow[]
    portionsDefault?: number
  } | null

  if (!body || !body.orderId) {
    return new Response(JSON.stringify({ ok: false, error: 'missing orderId' }), { status: 400 })
  }

  // 3) Normalize menus
  let menus: Menu[] = Array.isArray(body.menus) ? body.menus : []
  if (!menus.length && Array.isArray(body.results_rows)) {
    menus = mapResultsToMenus(body.results_rows, body.portionsDefault ?? 4)
  }
  if (!menus.length) {
    return new Response(JSON.stringify({ ok: false, error: 'no menus in payload' }), { status: 400 })
  }

  // 4) Upload data-URL heroes (keep https:// URLs as-is)
  const supabase = createServer()
  const processed: Menu[] = []
  for (const m of menus) {
    if (typeof m.hero === 'string' && m.hero.startsWith('data:image/')) {
      const [meta, data] = m.hero.split(',', 2)
      const ext = (meta.match(/^data:image\/([^;]+)/)?.[1] ?? 'jpg').toLowerCase()
      const bytes = Buffer.from(data, 'base64')
      const path = `orders/${body.orderId}/${m.id}.${ext}`
      const up = await supabase.storage.from('heroes').upload(path, bytes, {
        contentType: `image/${ext}`,
        upsert: true,
      })
      if (up.error) {
        console.error('upload error', up.error)
        return new Response(JSON.stringify({ ok: false, error: up.error.message }), { status: 500 })
      }
      const { data: pub } = supabase.storage.from('heroes').getPublicUrl(path)
      m.hero = pub.publicUrl
    }
    processed.push(m)
  }

  // 5) Update orders row
  const { data, error } = await supabase
    .from('orders')
    .update({ menus: processed })
    .eq('id', body.orderId)
    .select('id')
  if (error) {
    console.error(error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  }

  const count = Array.isArray(data) ? data.length : 0
  if (count === 0) {
    return new Response(JSON.stringify({
      ok: true,
      count: 0,
      note: 'No orders row matched orderId. Ensure orderId matches an existing orders.id.',
    }), { status: 200 })
  }

  return new Response(JSON.stringify({ ok: true, count }), { status: 200 })
}