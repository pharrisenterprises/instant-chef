// src/app/auth/signout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server' // adjust path to your helper

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()

  // Redirect home; use env base if set, otherwise same-origin is fine too
  return NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
  )
}
