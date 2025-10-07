// src/app/api/n8n/trigger/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '' // set in Vercel settings

export async function POST(request: Request) {
  try {
    if (!N8N_WEBHOOK_URL) {
      return NextResponse.json({ ok: false, error: 'N8N_WEBHOOK_URL not set' }, { status: 500 })
    }

    // Supabase (server) – read user from cookies
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Weekly planner payload from the client (sent by N8NGenerate.tsx)
    // Expecting shape:
    // {
    //   weeklyPlanner: { portionsPerDinner, groceryStore, dinnersNeededThisWeek, budgetType, budgetValue, weeklyOnHandText, weeklyMood, weeklyExtras },
    //   extra: { pantrySnapshot, barSnapshot, currentMenusCount, weeklyMood, weeklyExtras, weeklyOnHandText },
    //   generate: {...},
    //   correlationId: '...'
    // }
    const weekly = await request.json().catch(() => ({} as any))

    // Pull the user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.warn('profiles fetch error:', profileError)
    }

    // -------------------------
    // Build the merged payload
    // -------------------------

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
        ? profile.allergies.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      dislikesAvoidList: profile?.dislikes
        ? profile.dislikes.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      dietaryPrograms: profile?.dietary_programs
        ? profile.dietary_programs.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      macros: profile?.macros ?? '',
    }

    const shoppingPreferences = {
      storesNearMe: profile?.stores_near_me
        ? profile.stores_near_me.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      preferredGroceryStore: profile?.preferred_store ?? '',
      preferOrganic: profile?.organic_preference ?? 'Yes',
      preferNationalBrands: profile?.brand_preference ?? 'Yes',
    }

    // Origin for callbackUrl
    const origin = new URL(request.url).origin

    const bodyForN8n = {
      client: {
        basicInformation,
        householdSetup,
        cookingPreferences,
        dietaryProfile,
        shoppingPreferences,
        extra: {
          // ⬇️ Include the entire Weekly Menu Planning block
          weeklyPlanner: weekly?.weeklyPlanner ?? {},
          // Keep existing extras (snapshots, mood, etc.)
          weeklyMood: weekly?.extra?.weeklyMood ?? weekly?.weeklyPlanner?.weeklyMood ?? '',
          weeklyExtras: weekly?.extra?.weeklyExtras ?? weekly?.weeklyPlanner?.weeklyExtras ?? '',
          weeklyOnHandText: weekly?.extra?.weeklyOnHandText ?? weekly?.weeklyPlanner?.weeklyOnHandText ?? '',
          pantrySnapshot: weekly?.extra?.pantrySnapshot ?? [],
          barSnapshot: weekly?.extra?.barSnapshot ?? [],
          currentMenusCount: weekly?.extra?.currentMenusCount ?? 0,
        },
      },
      // pass through "generate" options if the planner sends them, else defaults
      generate: weekly?.generate ?? {
        menus: true,
        heroImages: true,
        menuCards: true,
        receipt: true,
      },
      correlationId: weekly?.correlationId ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`),
      callbackUrl: `${origin}/api/n8n/callback`,
    }

    // Forward to n8n webhook
    const resp = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(bodyForN8n),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error('n8n webhook failed', resp.status, text)
      return NextResponse.json({ ok: false, error: 'n8n webhook failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('n8n trigger error', err)
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
