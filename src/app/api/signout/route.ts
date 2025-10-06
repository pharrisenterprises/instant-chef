// src/app/api/signout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  await supabase.auth.signOut()

  // Redirect back to same origin (safe on Vercel)
  return NextResponse.redirect(new URL('/', request.url))
}
