// src/app/api/n8n/trigger/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ''

export async function POST(request: Request) {
  try {
    if (!N8N_WEBHOOK_URL) {
      return NextResponse.json(
        { ok: false, error: 'N8N_WEBHOOK_URL is not set on the server' },
        { status: 500 }
      )
    }

    // Read auth (server-side cookies)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated. Please log in and try again.' },
        { status: 401 }
      )
    }

    // Read client payload
    const weekly = await request.json().catch(() => ({} as any))

    // Fetch the user profile for n8n
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      // Profile missing isn’t fatal; we still forward with blanks.
      console.warn('[n8n trigger] profile fetch error:', profileError)
    }

    // Build the client block for n8n
    const basicInformation = {
      firstName: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
      email: profile?.email ?? user.email ?? '',
      accountAddress: {
        street: profile?.account_street ?? '',
        city: profile?.account_city ?? '',
        state: profile?.account_state ?? '',
        zipcode: profile?.account_zipcode ?? '',
      },
    }

    const householdSetup = {
      adults: profile?.adults ?? 0,
      teens: profile?.teens ?? 0,
      children: profile?.children ?? 0,
      toddlersInfants: profile?.toddlers ?? 0,
      portionsPerDinner: profile?.portions_per_dinner ?? 4,
      dinnersPerWeek: profile?.dinners_per_week ?? 3,
    }

    const cookingPreferences = {
      cookingSkill: profile?.cooking_skill ?? 'Beginner',
      cookingTimePreference: profile?.cooking_time ?? '30 min',
      equipment: Array.isArray(profile?.equipment) ? profile.equipment : [],
      otherEquipment: profile?.other_equipment ?? '',
    }

    const dietaryProfile = {
      allergiesRestrictions: profile?.allergies
        ? profile.allergies.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      dislikesAvoidList: profile?.dislikes
        ? profile.dislikes.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      dietaryPrograms: profile?.dietary_programs
        ? profile.dietary_programs.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      macros: profile?.macros ?? '',
    }

    const shoppingPreferences = {
      storesNearMe: profile?.stores_near_me
        ? profile.stores_near_me.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      preferredGroceryStore: profile?.preferred_store ?? '',
      preferOrganic: profile?.organic_preference ?? 'Yes',
      preferNationalBrands: profile?.brand_preference ?? 'Yes',
    }

    // Weekly planner comes from the client
    const weeklyPlanner = weekly?.weeklyPlanner ?? {}
    const extra = {
      weeklyPlanner,                              // <= full planner block
      weeklyMood: weekly?.extra?.weeklyMood ?? weeklyPlanner?.weeklyMood ?? '',
      weeklyExtras: weekly?.extra?.weeklyExtras ?? weeklyPlanner?.weeklyExtras ?? '',
      weeklyOnHandText: weekly?.extra?.weeklyOnHandText ?? weeklyPlanner?.weeklyOnHandText ?? '',
      pantrySnapshot: weekly?.extra?.pantrySnapshot ?? [],
      barSnapshot: weekly?.extra?.barSnapshot ?? [],
      currentMenusCount: weekly?.extra?.currentMenusCount ?? 0,
    }

    const origin = new URL(request.url).origin

    const bodyForN8n = {
      client: {
        basicInformation,
        householdSetup,
        cookingPreferences,
        dietaryProfile,
        shoppingPreferences,
        extra,
      },
      weeklyPlanner, // also mirrored at top-level if your workflow prefers this
      generate: weekly?.generate ?? {
        menus: true,
        heroImages: true,
        menuCards: true,
        receipt: true,
      },
      correlationId: weekly?.correlationId ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`),
      callbackUrl: `${origin}/api/n8n/callback`,
    }

    const resp = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(bodyForN8n),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error('[n8n trigger] webhook failed', resp.status, text)
      return NextResponse.json(
        { ok: false, error: `n8n webhook failed (${resp.status})` },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[n8n trigger] fatal', err)
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
